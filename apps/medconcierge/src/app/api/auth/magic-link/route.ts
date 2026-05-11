export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { z } from "zod"
import { db, users, auditLog } from "@quote-engine/db"
import { eq } from "drizzle-orm"
import { rateLimit, getClientIP } from "@/lib/rate-limit"
import { withAuthCookieDomain } from "@/lib/auth-cookie"
import { redactEmail } from "@quote-engine/notifications/redact"

const schema = z.object({
  email: z.string().email().max(255),
})

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request)
    const { success: allowed } = await rateLimit(`magic-link:${ip}`, 5, 60_000)
    if (!allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 },
      )
    }

    const email = parsed.data.email

    // Check if user exists in our DB — don't leak email existence
    const [existingUser] = await db
      .select({ id: users.id, tenantId: users.tenantId })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (!existingUser) {
      return NextResponse.json({ success: true })
    }

    const host = request.headers.get("host") || "auctorum.com.mx"
    const protocol = host.includes("localhost") ? "http" : "https"
    const redirectTo = `${protocol}://${host}/api/auth/callback`

    // Build response FIRST so cookie set() can write to it.
    // Using createServerClient (PKCE flow) so the code_verifier gets
    // persisted in a cookie — required for exchangeCodeForSession in the
    // callback. Cookie get() is safe: we only need to write, not recover
    // existing sessions.
    const response = NextResponse.json({ success: true })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        // getAll/setAll API for @supabase/ssr@0.10.x — handles chunked
        // auth cookies that exceed the per-cookie size limit.
        cookies: {
          getAll() {
            try {
              return request.cookies.getAll().map((c) => ({ name: c.name, value: c.value }))
            } catch {
              return []
            }
          },
          setAll(cookiesToSet) {
            for (const { name, value, options } of cookiesToSet) {
              try {
                const opts = withAuthCookieDomain(options ?? {}, host)
                response.cookies.set({ name, value, ...opts })
              } catch (e) {
                console.error("[magic-link] cookie set error:", e)
              }
            }
          },
        },
      },
    )

    console.log("[magic-link] Sending OTP to:", email, "redirectTo:", redirectTo)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    })

    if (error) {
      console.error("[magic-link] signInWithOtp error:", error.message)
      return NextResponse.json(
        { error: "Error al enviar enlace" },
        { status: 500 },
      )
    }

    // Audit trail. We log this AFTER Supabase accepts the OTP request
    // so failed sends don't pollute the log. The action is
    // 'auth.magic_link_requested' (not 'login.success' — that goes in
    // /api/auth/callback after the user actually clicks the link).
    await auditLog({
      tenantId: existingUser.tenantId,
      userId: existingUser.id,
      action: 'auth.magic_link_requested',
      entity: `user:${existingUser.id}`,
      ip: ip,
      after: { email: redactEmail(email) },
    })

    console.log("[magic-link] OTP sent successfully to:", redactEmail(email))
    return response
  } catch (err) {
    console.error("[magic-link] unexpected error:", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
