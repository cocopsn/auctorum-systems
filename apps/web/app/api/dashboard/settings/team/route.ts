import { NextRequest, NextResponse } from 'next/server'
import { db, users } from '@quote-engine/db'
import { eq, and } from 'drizzle-orm'
import { getAuthTenant } from '@/lib/auth'
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

// Web (B2B Quote Engine) tenant roles. Subset of the full system — there
// is no 'secretaria' role on the B2B side (medical-specific).
const TENANT_ROLES = ['admin', 'operator', 'viewer'] as const

const inviteSchema = z.object({
  email: z.string().email().max(255),
  role: z.enum(TENANT_ROLES),
})

export async function POST(request: NextRequest) {
  // Pre-2026-05-12 this route inserted a row with `crypto.randomUUID()`
  // as the user id, then sent the magic link separately. When the
  // invitee clicked the link they got a different Supabase auth.uid
  // and the placeholder row was dead weight forever — invited users
  // looped on login. Fixed here by creating the Supabase auth user
  // upfront and using their REAL auth.uid as the row id.
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    if (auth.user.role !== 'admin') {
      return NextResponse.json({ error: 'Solo admin puede invitar' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = inviteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { email, role } = parsed.data

    // Check if email already in this tenant
    const existing = await db
      .select()
      .from(users)
      .where(and(eq(users.tenantId, auth.tenant.id), eq(users.email, email)))
      .limit(1)

    if (existing.length > 0) {
      return NextResponse.json({ error: 'Este email ya pertenece al equipo' }, { status: 409 })
    }

    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://auctorum.com.mx'}/api/auth/callback`

    // 1. Resolve a real auth.uid for this email — create the auth user
    //    if needed, or look up an existing one (auth users are global).
    let authUserId: string | null = null
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { invited_by_tenant: auth.tenant.id, invited_role: role },
    })
    if (createErr) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 100 })
      const match = list?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase())
      if (match) authUserId = match.id
    } else {
      authUserId = created.user?.id ?? null
    }
    if (!authUserId) {
      return NextResponse.json(
        { error: 'No se pudo crear el usuario en Supabase Auth.' },
        { status: 500 },
      )
    }

    // 2. Insert (or upsert) the per-tenant users row keyed by the real
    //    auth.uid. ON CONFLICT covers the case where the user was
    //    removed and re-invited later.
    await db
      .insert(users)
      .values({
        id: authUserId,
        tenantId: auth.tenant.id,
        email,
        name: email.split('@')[0],
        role,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: { tenantId: auth.tenant.id, role, isActive: true },
      })

    // 3. Send the magic link AFTER persisting so when the invitee
    //    clicks it, the users row exists and getAuthTenant resolves.
    const { error: otpError } = await supabaseAnon.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    })
    if (otpError) {
      console.error('Invite OTP error:', otpError.message)
    }

    return NextResponse.json({ success: true, message: 'Invitación enviada' })
  } catch (err: any) {
    console.error('Team POST error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
