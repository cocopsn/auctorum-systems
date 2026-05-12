export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { createClient } from '@supabase/supabase-js'
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
  type TenantConfig,
  DEFAULT_TENANT_CONFIG,
} from '@quote-engine/db'
import { createCheckoutSession, createMPPreference, type PlanId } from '@quote-engine/payments'
import { rateLimit, getClientIP } from '@/lib/rate-limit'

// MXN amounts mirroring STRIPE_PLANS in @quote-engine/payments. Kept inline
// because MercadoPago Checkout Pro receives the amount directly (no priceId).
const PLAN_AMOUNTS_MXN: Record<'basico' | 'auctorum', { name: string; amount: number }> = {
  basico:   { name: 'Plan Básico',   amount: 1400 },
  auctorum: { name: 'Plan Auctorum', amount: 1800 },
}

// ---------------------------------------------------------------------------
// Supabase Admin (service-role) — for creating auth users during signup
// ---------------------------------------------------------------------------

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// ---------------------------------------------------------------------------
// Request body schema
// ---------------------------------------------------------------------------

const bodySchema = z.object({
  email: z.string().email().max(255),
  fullName: z.string().min(2).max(120),
  phone: z.string().max(20).optional(),
  businessName: z.string().min(2).max(255),
  slug: z.string().min(3).max(63).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug invalido'),
  tenantType: z.enum(['medical', 'industrial']),
  plan: z.enum(['basico', 'auctorum', 'enterprise']),
  doctorTitlePrefix: z.enum(['dr', 'dra', 'doc']).optional(),
  specialty: z.string().max(255).optional(),
  city: z.string().max(255).optional(),
  /** User must tick the T&C / Privacy checkbox in the signup UI. Required for adhesion contract validity (Art. 1803 CCF). */
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: 'Debe aceptar los Términos y Condiciones para continuar.' }),
  }),
  /** Payment processor for the first checkout. MercadoPago is primary (no RFC needed); Stripe is secondary. */
  processor: z.enum(['mercadopago', 'stripe']).default('mercadopago'),
})

// ---------------------------------------------------------------------------
// Default medical schedule (Mon-Fri 9:00-18:00)
// ---------------------------------------------------------------------------

function buildDefaultSchedules(tenantId: string) {
  return [1, 2, 3, 4, 5].map((day) => ({
    tenantId,
    dayOfWeek: day,
    startTime: '09:00',
    endTime: '18:00',
    slotDurationMin: 30,
    isActive: true,
  }))
}

// ---------------------------------------------------------------------------
// Default portal sections
// ---------------------------------------------------------------------------

function buildDefaultPortalSections() {
  return [
    {
      id: 'hero',
      type: 'hero' as const,
      visible: true,
      order: 0,
      data: { title: '', subtitle: '', ctaText: 'Agendar Cita' },
    },
    {
      id: 'about',
      type: 'about' as const,
      visible: true,
      order: 1,
      data: { heading: 'Acerca de', body: '' },
    },
    {
      id: 'services',
      type: 'services' as const,
      visible: true,
      order: 2,
      data: { heading: 'Servicios', items: [] },
    },
    {
      id: 'contact',
      type: 'contact' as const,
      visible: true,
      order: 3,
      data: { heading: 'Contacto', showMap: false },
    },
  ]
}

// ---------------------------------------------------------------------------
// Default tenant config for medical signup
// ---------------------------------------------------------------------------

function buildMedicalTenantConfig(opts: {
  businessName: string
  email: string
  phone?: string
  specialty?: string
  plan: string
}): TenantConfig {
  return {
    ...DEFAULT_TENANT_CONFIG,
    contact: {
      phone: opts.phone ?? '',
      email: opts.email,
      whatsapp: opts.phone ?? '',
      address: '',
    },
    business: {
      razon_social: opts.businessName,
      rfc: '',
      giro: 'Servicios Medicos',
    },
    account: {
      type: 'medical',
      plan: opts.plan,
      portalHost: 'portal.auctorum.com.mx',
    },
    medical: {
      specialty: opts.specialty ?? '',
      sub_specialty: '',
      cedula_profesional: '',
      cedula_especialidad: '',
      consultation_fee: 0,
      consultation_duration_min: 30,
      accepts_insurance: false,
      insurance_providers: [],
    },
    schedule_settings: {
      timezone: 'America/Mexico_City',
      advance_booking_days: 30,
      min_booking_hours_ahead: 2,
      cancellation_hours: 24,
      auto_confirm: true,
      allow_online_payment: false,
      show_fee_on_portal: false,
    },
    notifications: {
      whatsapp_on_new_appointment: true,
      whatsapp_reminder_24h: true,
      whatsapp_reminder_2h: true,
      email_on_new_appointment: true,
      notify_on_cancellation: true,
    },
    features: {
      intake_forms: false,
      clinical_records: false,
      ai_scribe: false,
      telehealth: false,
      online_payment: false,
    },
  }
}

// ---------------------------------------------------------------------------
// POST /api/signup
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // ---- Rate limit -------------------------------------------------------
    const ip = getClientIP(request)
    const { success: allowed } = await rateLimit(`signup:${ip}`, 3, 3_600_000)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intenta de nuevo en una hora.' },
        { status: 429 },
      )
    }

    // ---- Parse & validate body --------------------------------------------
    const body = await request.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]
      return NextResponse.json(
        { error: firstError?.message ?? 'Datos invalidos' },
        { status: 400 },
      )
    }

    const data = parsed.data

    // ---- Build tenant slug ------------------------------------------------
    const tenantSlug =
      data.tenantType === 'medical' && data.doctorTitlePrefix
        ? `${data.doctorTitlePrefix}-${data.slug}`
        : data.slug

    // ---- Check slug availability ------------------------------------------
    const [existingTenant] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, tenantSlug))
      .limit(1)

    if (existingTenant) {
      return NextResponse.json(
        { error: 'Este slug ya esta en uso. Elige otro nombre.' },
        { status: 409 },
      )
    }

    // ---- Check email availability -----------------------------------------
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1)

    if (existingUser) {
      return NextResponse.json(
        { error: 'Este correo ya esta registrado. Intenta iniciar sesion.' },
        { status: 409 },
      )
    }

    // ---- Create Supabase auth user ----------------------------------------
    const tempPassword =
      'Tmp!' + crypto.randomUUID().replace(/-/g, '').slice(0, 16)

    // email_confirm: true requires the user to click the verification
    // email Supabase sends before login is allowed. Pre-2026-05-11 this
    // was false → anyone could squat a slug against someone else's email
    // (tenant takeover). The tenant row is still created below (we need
    // the slug reserved + Stripe Checkout to flow) but its
    // provisioningStatus stays 'unverified' until the auth callback
    // confirms ownership of the email.
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: data.fullName,
          tenant_type: data.tenantType,
        },
      })

    if (authError || !authData.user) {
      console.error('[signup] Supabase auth error:', authError?.message)
      return NextResponse.json(
        { error: 'Error al crear la cuenta. Intenta de nuevo.' },
        { status: 500 },
      )
    }

    const authUserId = authData.user.id

    // ---- DB transaction: create all records -------------------------------
    let tenantId: string = ''

    const tenantConfig =
      data.tenantType === 'medical'
        ? buildMedicalTenantConfig({
            businessName: data.businessName,
            email: data.email,
            phone: data.phone,
            specialty: data.specialty,
            plan: data.plan,
          })
        : {
            ...DEFAULT_TENANT_CONFIG,
            contact: {
              ...DEFAULT_TENANT_CONFIG.contact,
              email: data.email,
              phone: data.phone ?? '',
              whatsapp: data.phone ?? '',
            },
            business: {
              ...DEFAULT_TENANT_CONFIG.business,
              razon_social: data.businessName,
            },
            account: {
              type: 'industrial' as const,
              plan: data.plan,
              portalHost: 'portal.auctorum.com.mx',
            },
          }

    try {
      await db.transaction(async (tx) => {
        // 1. Create tenant
        const [newTenant] = await tx
          .insert(tenants)
          .values({
            slug: tenantSlug,
            name: data.businessName,
            tenantType: data.tenantType,
            publicSubdomain: tenantSlug,
            publicSubdomainPrefix:
              data.tenantType === 'medical'
                ? data.doctorTitlePrefix ?? 'dr'
                : undefined,
            // 'unverified' until the user clicks the magic-link / email
            // confirmation. The auth callback (POST /api/auth/callback)
            // promotes to 'pending_plan' on first successful login.
            provisioningStatus: 'unverified',
            plan: data.plan === 'enterprise' ? 'enterprise' : data.plan,
            config: tenantConfig,
          })
          .returning({ id: tenants.id })

        tenantId = newTenant.id

        // 2. Create user record
        await tx.insert(users).values({
          id: authUserId,
          tenantId,
          email: data.email,
          name: data.fullName,
          role: 'admin',
        })

        // 3. Create subscription (pending until Stripe confirms)
        const planAmount =
          data.plan === 'basico'
            ? '1400'
            : data.plan === 'auctorum'
              ? '1800'
              : '0'

        await tx.insert(subscriptions).values({
          tenantId,
          plan: data.plan,
          status: 'pending',
          amount: planAmount,
          currency: 'MXN',
          billingCycle: 'monthly',
        })

        // 4. Create onboarding progress
        await tx.insert(onboardingProgress).values({
          tenantId,
          stepsJson: { plan_confirmed: data.plan !== 'enterprise' },
          vertical: { tenantType: data.tenantType, plan: data.plan },
        })

        // 5. Medical-specific records
        if (data.tenantType === 'medical') {
          // Doctor profile
          await tx.insert(doctors).values({
            tenantId,
            name: data.fullName,
            specialty: data.specialty ?? '',
            email: data.email,
            phone: data.phone ?? '',
            consultationDurationMin: 30,
          })

          // Default portal page
          await tx.insert(portalPages).values({
            tenantId,
            slug: 'home',
            title: data.businessName,
            isHomepage: true,
            sections: buildDefaultPortalSections(),
            // Published by default — tenants in 'unverified' / 'pending_plan'
            // still get their public landing visible immediately so they can
            // share the URL with the doctor for review BEFORE paying. The
            // dashboard provisioning gate (apps/medconcierge/src/app/(dashboard)/layout.tsx)
            // bounces non-paying tenants out of authenticated surfaces.
            published: true,
            sortOrder: 0,
          })

          // Default schedule (Mon-Fri)
          const scheduleRows = buildDefaultSchedules(tenantId)
          if (scheduleRows.length > 0) {
            await tx.insert(schedules).values(scheduleRows)
          }

          // Placeholder integrations (WhatsApp + Google Calendar)
          await tx.insert(integrations).values([
            {
              tenantId,
              type: 'whatsapp',
              status: 'disconnected',
              config: {},
            },
            {
              tenantId,
              type: 'google_calendar',
              status: 'disconnected',
              config: {},
            },
          ])

          // Bot instance placeholder
          await tx.insert(botInstances).values({
            tenantId,
            channel: 'whatsapp',
            provider: 'meta',
            status: 'draft',
            config: {},
          })
        }
      })
    } catch (txErr) {
      console.error('[signup] DB transaction error:', txErr)
      // Attempt to clean up the Supabase auth user
      await supabaseAdmin.auth.admin.deleteUser(authUserId).catch(() => {})
      return NextResponse.json(
        { error: 'Error al registrar la cuenta. Intenta de nuevo.' },
        { status: 500 },
      )
    }

    // ---- Enterprise: no checkout needed -----------------------------------
    if (data.plan === 'enterprise') {
      return NextResponse.json({
        ok: true,
        tenantId,
        redirect: '/signup/success',
      })
    }

    // ---- Paid plans: route to MercadoPago (primary) or Stripe ------------
    //
    // Success/failure URLs target the user's actual tenant subdomain.
    // For medical tenants that's `<slug>.auctorum.com.mx` (so the
    // doctor lands inside their own PWA, not portal.* which is the
    // B2B app). For B2B/industrial tenants we keep portal.*.
    // Webhook URL targets med.auctorum.com.mx — the medconcierge
    // process is the one with the patient/clinical handlers wired up.
    const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'auctorum.com.mx'
    const tenantHost =
      data.tenantType === 'medical'
        ? `${tenantSlug}.${appDomain}`
        : `portal.${appDomain}`
    const webhookHost = `med.${appDomain}`

    const planKey = data.plan as 'basico' | 'auctorum'
    const planMeta = PLAN_AMOUNTS_MXN[planKey]
    if (data.processor === 'mercadopago') {
      try {
        const preference = await createMPPreference({
          tenantId,
          planId: data.plan,
          planName: planMeta.name,
          amount: planMeta.amount,
          payerEmail: data.email,
          successUrl: `https://${tenantHost}/login?signup=success&payment=mercadopago&tenant=${tenantId}`,
          failureUrl: `https://${tenantHost}/signup?payment=failed`,
          pendingUrl: `https://${tenantHost}/signup?payment=pending`,
          webhookUrl: `https://${webhookHost}/api/webhooks/mercadopago`,
        })

        // init_point is the hosted checkout URL; sandbox_init_point exists for test
        const checkoutUrl =
          (preference as { init_point?: string; sandbox_init_point?: string }).init_point ??
          (preference as { sandbox_init_point?: string }).sandbox_init_point ??
          null
        if (!checkoutUrl) throw new Error('MercadoPago preference returned no init_point')

        return NextResponse.json({ ok: true, tenantId, checkoutUrl, processor: 'mercadopago' })
      } catch (mpErr) {
        console.error('[signup] MercadoPago checkout error:', mpErr)
        return NextResponse.json(
          {
            ok: true,
            tenantId,
            error:
              'Cuenta creada pero hubo un error al conectar con MercadoPago. Intenta desde tu perfil o usa Stripe.',
            redirect: '/login',
          },
          { status: 200 },
        )
      }
    }

    // Fallback / explicit Stripe selection
    try {
      const session = await createCheckoutSession({
        tenantId,
        planId: data.plan as PlanId,
        customerEmail: data.email,
        successUrl: `https://${tenantHost}/login?signup=success`,
        cancelUrl: `https://${tenantHost}/signup?cancelled=true`,
      })

      return NextResponse.json({
        ok: true,
        tenantId,
        checkoutUrl: session.url,
        processor: 'stripe',
      })
    } catch (stripeErr) {
      console.error('[signup] Stripe checkout error:', stripeErr)
      // The tenant was created but Stripe failed — they can retry from login
      return NextResponse.json(
        {
          ok: true,
          tenantId,
          error:
            'Cuenta creada pero hubo un error al conectar con el procesador de pagos. Intenta desde tu perfil.',
          redirect: '/login',
        },
        { status: 201 },
      )
    }
  } catch (err) {
    console.error('[signup] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}
