import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db, users } from '@quote-engine/db'
import { eq } from 'drizzle-orm'
import { createClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rate-limit'

const schema = z.object({
  email: z.string().email().max(255),
})

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
    const { success } = rateLimit(`magic-link:${ip}`, 5, 60_000)
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    // Check if user exists in our DB — don't leak email existence
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, parsed.data.email))
      .limit(1)

    if (!existingUser) {
      // Return success even if user doesn't exist to avoid email enumeration
      return NextResponse.json({ success: true })
    }

    // signInWithOtp is a public auth method — use anon key to minimize blast radius
    // (service_role key is not needed and would give this endpoint elevated permissions)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://auctorum.com.mx'}/api/auth/callback`
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data.email,
      options: { emailRedirectTo: redirectTo },
    })

    if (error) {
      console.error('Magic link error:', error.message)
      return NextResponse.json({ error: 'Error al enviar enlace' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Magic link route error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
