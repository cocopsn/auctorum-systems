export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { z } from "zod"
import { db, users } from "@quote-engine/db"
import { eq } from "drizzle-orm"
import { rateLimit } from "@/lib/rate-limit"

const schema = z.object({
  email: z.string().email().max(255),
})

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown"
    const { success: allowed } = rateLimit(`magic-link:${ip}`, 5, 60_000)
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

    // Check if user exists in our DB — don't leak email existence
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, parsed.data.email))
      .limit(1)

    if (!existingUser) {
      return NextResponse.json({ success: true })
    }

    const host = request.headers.get("host") || "auctorum.com.mx"
    const protocol = host.includes("localhost") ? "http" : "https"
    const redirectTo = `${protocol}://${host}/api/auth/callback`

    // Use service-role admin client — avoids PKCE cookie issues and session
    // corruption that can cause signInWithOtp to hang indefinitely.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    const { error } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: parsed.data.email,
      options: { redirectTo },
    })

    if (error) {
      console.error("[magic-link] admin.generateLink failed:", error.message)
      // Fallback to signInWithOtp via admin client (not session-based)
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: parsed.data.email,
        options: { emailRedirectTo: redirectTo },
      })
      if (otpError) {
        console.error("[magic-link] signInWithOtp error:", otpError.message)
        return NextResponse.json(
          { error: "Error al enviar enlace" },
          { status: 500 },
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[magic-link] unexpected error:", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
