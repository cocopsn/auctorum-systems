import { NextRequest, NextResponse } from 'next/server'
import { db, users } from '@quote-engine/db'
import { eq, and } from 'drizzle-orm'
import { getAuthTenant, requireRole } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const teamMembers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.tenantId, auth.tenant.id))

    return NextResponse.json({ team: teamMembers })
  } catch (err: any) {
    console.error('Team GET error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

const inviteSchema = z.object({
  email: z.string().email().max(255),
  role: z.enum(['admin', 'operator', 'viewer']),
})

export async function POST(request: NextRequest) {
  // TODO: M8 — The placeholder user ID created during team invite does not match
  // the Supabase UID that the invited user gets when they actually sign up.
  // Need a "claim" flow: when an invited user logs in for the first time, match
  // them by email and update the users table record to use their real Supabase UID.
  // Ref: pentest finding M8 — Team invite UUID mismatch
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const parsed = inviteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { email, role } = parsed.data

    // Check if email already in tenant
    const existing = await db
      .select()
      .from(users)
      .where(and(eq(users.tenantId, auth.tenant.id), eq(users.email, email)))
      .limit(1)

    if (existing.length > 0) {
      return NextResponse.json({ error: 'Este email ya pertenece al equipo' }, { status: 409 })
    }

    // Send magic link invitation via Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://auctorum.com.mx'}/api/auth/callback`

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    })

    if (otpError) {
      console.error('Invite OTP error:', otpError.message)
    }

    // We create a placeholder user record - the actual Supabase user ID will be linked on first login
    // For now, generate a temporary UUID
    const tempId = crypto.randomUUID()
    await db.insert(users).values({
      id: tempId,
      tenantId: auth.tenant.id,
      email,
      name: email.split('@')[0],
      role,
    })

    return NextResponse.json({ success: true, message: 'Invitacion enviada' })
  } catch (err: any) {
    console.error('Team POST error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
