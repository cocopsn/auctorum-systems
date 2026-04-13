import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db, users } from '@quote-engine/db'
import { eq } from 'drizzle-orm'
import { createServerClient } from '@supabase/ssr'
import { rateLimit } from '@/lib/rate-limit'
import { withAuthCookieDomain } from '@/lib/auth-cookie'

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

    const host = request.headers.get('host') || 'auctorum.com.mx'
    const origin = host.includes('localhost') ? `http://${host}` : `https://${host}`
    const redirectTo = `${origin}/api/auth/callback`

    // Use createServerClient so PKCE code_verifier is stored in a cookie
    const response = NextResponse.json({ success: true })
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: Record<string, unknown>) {
            response.cookies.set({ name, value, ...withAuthCookieDomain(options ?? {}, host) })
          },
          remove(name: string, options: Record<string, unknown>) {
            response.cookies.set({ name, value: '', ...withAuthCookieDomain(options ?? {}, host) })
          },
        },
      }
    )

    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data.email,
      options: { emailRedirectTo: redirectTo },
    })

    if (error) {
      console.error('Magic link error:', error.message)
      return NextResponse.json({ error: 'Error al enviar enlace' }, { status: 500 })
    }

    return response
  } catch (error) {
    console.error('Magic link route error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
