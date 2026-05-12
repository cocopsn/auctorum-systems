import { NextRequest, NextResponse } from 'next/server'
import { db, users } from '@quote-engine/db'
import { eq, and } from 'drizzle-orm'
import { getAuthTenant } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { validateOrigin } from '@/lib/csrf'

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

// Tenant roles (post-2026-05-12 — added 'secretaria').
// - admin     → full access incl. billing, team, role changes, refunds, deletes
// - secretaria→ patient management, appointments, conversations, documents,
//               reports view. NO billing, team mgmt, refunds, role changes,
//               clinical record edits (only view).
// - operator  → legacy role; effectively same as secretaria for medconcierge
// - viewer    → read-only across the dashboard
export const TENANT_ROLES = ['admin', 'secretaria', 'operator', 'viewer'] as const

const inviteSchema = z.object({
  email: z.string().email().max(255),
  role: z.enum(TENANT_ROLES),
})

export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });

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

    // Use the admin API to create the Supabase auth user upfront so we
    // know their real auth.uid before inserting our `users` row. Pre-
    // 2026-05-12 we generated a `tempId` here and hoped the auth
    // callback would reconcile it later — that reconciliation never
    // existed, so invited members were orphaned forever (login looped).
    //
    // If the auth user already exists (the invitee was already a
    // Supabase user from some other tenant), we look up their uid and
    // attach a NEW users row for this tenant — Supabase auth users are
    // global but our `users` table is per-tenant.
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    let authUserId: string | null = null
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { invited_by_tenant: auth.tenant.id, invited_role: role },
    })
    if (createErr) {
      // Most common error: "User already registered" — look them up.
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

    // Insert (or upsert) the per-tenant users row keyed by the REAL
    // auth.uid. ON CONFLICT (id) DO UPDATE handles the rare case where
    // the same auth user gets re-invited (e.g. admin removed them then
    // re-invited).
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

    // Send the magic link AFTER persisting so when the invitee clicks
    // it, the users row already exists and getAuthTenant() resolves.
    const { error: otpError } = await supabase.auth.signInWithOtp({
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
