export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { z } from "zod"
import { db, users } from "@quote-engine/db"
import { eq } from "drizzle-orm"
import { rateLimit, getClientIP } from "@/lib/rate-limit"
import { withAuthCookieDomain } from "@/lib/auth-cookie"
import { safeGetAuthCookie } from "@/lib/safe-cookie-get"

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
      .select({ id: users.id })
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
        cookies: {
          get(name: string) {
            try {
              return safeGetAuthCookie(request.cookies.get(name)?.value)
            } catch {
              return undefined
            }
          },
          set(name: string, value: string, options: Record<string, unknown>) {
            try {
              const opts = withAuthCookieDomain(options ?? {}, host)
              response.cookies.set({ name, value, ...opts })
            } catch (e) {
              console.error("[magic-link] cookie set error:", e)
            }
          },
          remove(name: string, options: Record<string, unknown>) {
            try {
              const opts = withAuthCookieDomain(options ?? {}, host)
              response.cookies.set({ name, value: "", ...opts, maxAge: 0 })
            } catch (e) {
              console.error("[magic-link] cookie remove error:", e)
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

    console.log("[magic-link] OTP sent successfully to:", email)
    return response
  } catch (err) {
    console.error("[magic-link] unexpected error:", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
