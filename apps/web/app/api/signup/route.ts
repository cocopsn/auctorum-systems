export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import {
  db,
  tenants,
  users,
  onboardingProgress,
  DEFAULT_TENANT_CONFIG,
} from '@quote-engine/db'
import { createServerClient, createAnonClient } from '@/lib/supabase-server'
import { validateSlug } from '@/lib/slug'
import { rateLimit } from '@/lib/rate-limit'

const bodySchema = z.object({
  email: z.string().email().max(255),
  fullName: z.string().min(2).max(120),
  businessName: z.string().min(2).max(255),
  slug: z.string().min(3).max(63),
})

export async function POST(req: NextRequest) {
  // Rate limit: 3 signups per IP per hour
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const rl = rateLimit(`signup:${ip}`, 3, 3_600_000)
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Intente en una hora.' },
      { status: 429 },
    )
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const { email, fullName, businessName, slug: rawSlug } = parsed.data
  const slug = rawSlug.trim().toLowerCase()
  const normalizedEmail = email.trim().toLowerCase()

  // Validate slug server-side (defense in depth)
  const slugError = validateSlug(slug)
  if (slugError) {
    return NextResponse.json({ error: slugError }, { status: 400 })
  }

  // Check slug uniqueness
  const [slugTaken] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1)
  if (slugTaken) {
    return NextResponse.json(
      { error: 'Este subdominio ya está en uso' },
      { status: 409 },
    )
  }

  // Check email not already registered
  const [emailTaken] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1)
  if (emailTaken) {
    return NextResponse.json(
      { error: 'Este correo ya tiene una cuenta. Inicie sesión.' },
      { status: 409 },
    )
  }

  // Step 1: create Supabase auth user (external call, cannot be in DB tx)
  const admin = createServerClient()
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: normalizedEmail,
    email_confirm: false,
    user_metadata: { full_name: fullName, signup_source: 'web_public' },
  })

  if (authError || !authData.user) {
    console.error('[signup] auth.admin.createUser failed', authError)
    return NextResponse.json({ error: 'Error al crear la cuenta' }, { status: 500 })
  }

  const authUserId = authData.user.id

  // Step 2: DB transaction — tenant + user + onboarding_progress
  let tenantId: string
  try {
    tenantId = await db.transaction(async (tx) => {
      const [tenant] = await tx
        .insert(tenants)
        .values({
          slug,
          name: businessName,
          config: DEFAULT_TENANT_CONFIG,
          plan: 'basico',
          isActive: true,
        })
        .returning({ id: tenants.id })

      await tx.insert(users).values({
        id: authUserId,
        tenantId: tenant.id,
        email: normalizedEmail,
        name: fullName,
        role: 'admin',
      })

      await tx.insert(onboardingProgress).values({
        tenantId: tenant.id,
        stepsJson: {
          business_configured: false,
          whatsapp_connected: false,
          first_product_or_service: false,
          schedule_configured: false,
          test_quote_or_appointment: false,
        },
      })

      return tenant.id
    })
  } catch (err) {
    console.error('[signup] DB transaction failed', err)
    // Best-effort rollback of auth user
    await admin.auth.admin.deleteUser(authUserId).catch((e) =>
      console.error('[signup] rollback deleteUser failed', e),
    )
    return NextResponse.json(
      { error: 'Error al crear el espacio de trabajo' },
      { status: 500 },
    )
  }

  // Step 3: send magic link via anon client (same as /api/auth/magic-link)
  const anon = createAnonClient()
  const redirectTo = `${
    process.env.NEXT_PUBLIC_SITE_URL || 'https://auctorum.com.mx'
  }/api/auth/callback`
  const { error: otpError } = await anon.auth.signInWithOtp({
    email: normalizedEmail,
    options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
  })

  if (otpError) {
    console.error('[signup] signInWithOtp failed after user creation', otpError)
    return NextResponse.json(
      {
        ok: true,
        warning:
          'Cuenta creada pero no pudimos enviar el enlace. Use /login.',
      },
      { status: 200 },
    )
  }

  return NextResponse.json({ ok: true })
}
