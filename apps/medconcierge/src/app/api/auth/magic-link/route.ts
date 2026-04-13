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

    // Stateless client with anon key — signInWithOtp actually sends the email.
    // Using createClient (not createServerClient) avoids PKCE/cookie issues
    // that can cause hangs with corrupted session cookies.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
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
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[magic-link] unexpected error:", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
