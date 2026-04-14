export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import {
  db,
  tenants,
  users,
  onboardingProgress,
  subscriptions,
  doctors,
  portalPages,
  schedules,
  integrations,
  botInstances,
  type PublicSubdomainPrefix,
  type TenantType,
} from '@quote-engine/db'
import { createServerClient, createAnonClient } from '@/lib/supabase-server'
import { validateSlug } from '@/lib/slug'
import { rateLimit } from '@/lib/rate-limit'
import { PORTAL_HOST, buildPortalUrl } from '@/lib/hosts'
import {
  buildPublicHost,
  buildPublicSubdomain,
  buildTenantConfig,
  getDefaultMedicalPortalSections,
  getDefaultMedicalSchedules,
  getTenantSlugForSignup,
} from '@/lib/signup'

const bodySchema = z.object({
  email: z.string().email().max(255),
  fullName: z.string().min(2).max(120),
  businessName: z.string().min(2).max(255),
  slug: z.string().min(3).max(63),
  tenantType: z.enum(['medical', 'industrial']),
  plan: z.enum(['free', 'pro', 'enterprise']),
  doctorTitlePrefix: z.enum(['dr', 'dra', 'doc']).optional(),
  doctorName: z.string().max(255).optional(),
  specialty: z.string().max(255).optional(),
})

export async function POST(req: NextRequest) {
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
    return NextResponse.json({ error: 'Datos invalidos' }, { status: 400 })
  }

  const {
    email,
    fullName,
    businessName,
    slug: rawSlug,
    tenantType,
    plan,
    doctorTitlePrefix,
    doctorName,
    specialty,
  } = parsed.data

  const slug = rawSlug.trim().toLowerCase()
  const normalizedEmail = email.trim().toLowerCase()
  const publicPrefix = doctorTitlePrefix as PublicSubdomainPrefix | undefined

  const slugError = validateSlug(slug)
  if (slugError) {
    return NextResponse.json({ error: slugError }, { status: 400 })
  }

  if (tenantType === 'medical' && !publicPrefix) {
    return NextResponse.json({ error: 'Seleccione un prefijo medico valido' }, { status: 400 })
  }

  const tenantSlug = getTenantSlugForSignup({
    tenantType: tenantType as TenantType,
    slug,
    publicSubdomainPrefix: tenantType === 'medical' ? publicPrefix : undefined,
  })
  const publicSubdomain = tenantType === 'medical' && publicPrefix
    ? buildPublicSubdomain(publicPrefix, slug)
    : null
  const publicHost = buildPublicHost(publicSubdomain)

  const [slugTaken] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, tenantSlug))
    .limit(1)
  if (slugTaken) {
    return NextResponse.json(
      { error: 'Este subdominio ya esta en uso' },
      { status: 409 },
    )
  }

  const [emailTaken] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1)
  if (emailTaken) {
    return NextResponse.json(
      { error: 'Este correo ya tiene una cuenta. Inicie sesion.' },
      { status: 409 },
    )
  }

  const admin = createServerClient()
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: normalizedEmail,
    email_confirm: false,
    user_metadata: {
      full_name: fullName,
      doctor_name: doctorName || fullName,
      signup_source: 'web_public',
      tenant_type: tenantType,
      plan,
    },
  })

  if (authError || !authData.user) {
    console.error('[signup] auth.admin.createUser failed', authError)
    return NextResponse.json({ error: 'Error al crear la cuenta' }, { status: 500 })
  }

  const authUserId = authData.user.id

  let tenantId: string
  try {
    tenantId = await db.transaction(async (tx) => {
      const [tenant] = await tx
        .insert(tenants)
        .values({
          slug: tenantSlug,
          name: businessName,
          tenantType,
          publicSubdomain,
          publicSubdomainPrefix: tenantType === 'medical' ? publicPrefix : null,
          provisioningStatus: 'active',
          provisionedAt: new Date(),
          config: buildTenantConfig({
            tenantType: tenantType as TenantType,
            plan,
            businessName,
            doctorSpecialty: specialty,
            publicHost: publicHost ?? undefined,
          }),
          plan,
          isActive: true,
        })
        .returning({ id: tenants.id })

      await tx.insert(users).values({
        id: authUserId,
        tenantId: tenant.id,
        email: normalizedEmail,
        name: doctorName || fullName,
        role: 'admin',
      })

      await tx.insert(subscriptions).values({
        tenantId: tenant.id,
        plan,
        status: 'active',
        amount: plan === 'pro' ? '1500' : '0',
        currency: 'MXN',
        billingCycle: 'monthly',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        gracePeriodDays: 3,
      })

      await tx.insert(onboardingProgress).values({
        tenantId: tenant.id,
        stepsJson: {
          plan_confirmed: true,
          business_configured: false,
          branding_configured: false,
          whatsapp_mode_selected: false,
          whatsapp_connected: false,
          google_connected: false,
          first_product_or_service: false,
          schedule_configured: false,
          public_portal_published: false,
          test_quote_or_appointment: false,
        },
        vertical: {
          tenantType,
          plan,
        },
      })

      if (tenantType === 'medical') {
        await tx.insert(doctors).values({
          tenantId: tenant.id,
          specialty: specialty || 'Medicina general',
          subSpecialty: '',
          bio: doctorName || fullName,
        })

        await tx.insert(portalPages).values({
          tenantId: tenant.id,
          slug: 'home',
          title: businessName,
          isHomepage: true,
          sections: getDefaultMedicalPortalSections({
            tenantName: businessName,
            specialty,
            whatsapp: '',
          }),
          portalConfig: {
            businessName,
            published: false,
          },
        })

        await tx.insert(schedules).values(getDefaultMedicalSchedules(tenant.id))

        await tx.insert(integrations).values([
          {
            tenantId: tenant.id,
            type: 'meta_business',
            status: 'disconnected',
            config: {
              mode: 'managed_shared_waba',
              webhook_status: 'pending',
            },
          },
          {
            tenantId: tenant.id,
            type: 'google_calendar',
            status: 'disconnected',
            config: {
              mode: 'managed_shared_service_account',
              sync_status: 'pending',
            },
          },
        ])

        await tx.insert(botInstances).values({
          tenantId: tenant.id,
          channel: 'whatsapp',
          provider: 'meta',
          status: 'draft',
          config: {
            mode: 'managed_shared_waba',
          },
        })
      }

      return tenant.id
    })
  } catch (err) {
    console.error('[signup] DB transaction failed', err)
    await admin.auth.admin.deleteUser(authUserId).catch((rollbackError) =>
      console.error('[signup] rollback deleteUser failed', rollbackError),
    )
    return NextResponse.json(
      { error: 'Error al crear el espacio de trabajo' },
      { status: 500 },
    )
  }

  const anon = createAnonClient()
  const { error: otpError } = await anon.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      emailRedirectTo: buildPortalUrl('/api/auth/callback'),
      shouldCreateUser: false,
    },
  })

  if (otpError) {
    console.error('[signup] signInWithOtp failed after user creation', otpError)
    return NextResponse.json(
      {
        ok: true,
        tenantId,
        provisioningStatus: 'active',
        portalHost: PORTAL_HOST,
        publicHost,
        warning: 'Cuenta creada pero no pudimos enviar el enlace. Use /login.',
      },
      { status: 200 },
    )
  }

  return NextResponse.json({
    ok: true,
    tenantId,
    provisioningStatus: 'active',
    portalHost: PORTAL_HOST,
    publicHost,
  })
}
