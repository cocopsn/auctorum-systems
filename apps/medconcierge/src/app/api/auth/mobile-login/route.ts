export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { createClient } from '@supabase/supabase-js'
import { db, users, tenants } from '@quote-engine/db'
import { rateLimit, getClientIP } from '@/lib/rate-limit'

const bodySchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(6).max(200),
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

/**
 * POST /api/auth/mobile-login
 *
 * Email + password login for the mobile app. Returns Supabase session
 * tokens (access_token, refresh_token) plus the user / tenant context the
 * app needs to render its dashboard.
 *
 * Rate-limited to 10 attempts per IP per hour.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIP(req)
    const { success: allowed } = await rateLimit(`mobile-login:${ip}`, 10, 3_600_000)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Intenta más tarde.' },
        { status: 429 },
      )
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 },
      )
    }
    const { email, password } = parsed.data

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.session || !data.user) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 },
      )
    }

    // Resolve our internal user + tenant (users.id == auth.users.id)
    const [internalUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, data.user.id))
      .limit(1)

    if (!internalUser) {
      // Auth succeeded in Supabase but no medconcierge user record. Sign the
      // session out to avoid a half-authenticated state in the mobile app.
      await supabase.auth.admin.signOut(data.session.access_token).catch(() => {})
      return NextResponse.json(
        { error: 'Usuario no encontrado en el sistema' },
        { status: 404 },
      )
    }

    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, internalUser.tenantId))
      .limit(1)

    // Best-effort: bump last_login_at (don't fail the request if it errors)
    void db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, internalUser.id))
      .catch(() => {})

    return NextResponse.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      user: {
        id: internalUser.id,
        email: internalUser.email,
        name: internalUser.name,
        role: internalUser.role,
      },
      tenant: tenant
        ? {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            plan: tenant.plan,
          }
        : null,
    })
  } catch (err) {
    console.error('[POST /api/auth/mobile-login] error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
