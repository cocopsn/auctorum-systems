import { NextRequest, NextResponse } from 'next/server'
import { db, onboardingProgress, tenants, integrations } from '@quote-engine/db'
import { and, eq, sql } from 'drizzle-orm'
import { getAuthTenant } from '@/lib/auth'
import { z } from 'zod'

// Server-side validators per step. Same idea as medconcierge — pre-2026-05-11
// the client could mark any step done without doing the work.
const STEP_VALIDATORS: Record<string, (tenantId: string) => Promise<boolean>> = {
  plan_confirmed: async (tenantId) => {
    const [t] = await db
      .select({ status: tenants.provisioningStatus })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1)
    if (!t) return false
    return t.status === 'active' || t.status === 'pending_plan'
  },
  business_configured: async (tenantId) => {
    const [t] = await db
      .select({ name: tenants.name, config: tenants.config })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1)
    if (!t) return false
    const cfg = (t.config as Record<string, unknown> | null) ?? {}
    const business = cfg.business as Record<string, string> | undefined
    return !!t.name && (!!business?.rfc || !!business?.razon_social)
  },
  whatsapp_connected: async (tenantId) => {
    const [row] = await db
      .select({ id: integrations.id })
      .from(integrations)
      .where(
        and(
          eq(integrations.tenantId, tenantId),
          eq(integrations.type, 'meta_business'),
          eq(integrations.status, 'connected'),
        ),
      )
      .limit(1)
    return !!row
  },
  first_product_or_service: async (tenantId) => {
    const [{ count }] = (await db.execute(
      sql`SELECT COUNT(*)::int AS count FROM products WHERE tenant_id = ${tenantId}::uuid`,
    )) as unknown as Array<{ count: number }>
    return count > 0
  },
  test_quote_or_appointment: async (tenantId) => {
    const [{ count }] = (await db.execute(
      sql`SELECT COUNT(*)::int AS count FROM quotes WHERE tenant_id = ${tenantId}::uuid`,
    )) as unknown as Array<{ count: number }>
    return count > 0
  },
}

export const dynamic = 'force-dynamic'

type StepDefinition = {
  key: string
  label: string
  title: string
  description: string
  href: string
}

function getVerticalContext(tenant: { tenantType: string | null; plan: string | null }) {
  return {
    tenantType: tenant.tenantType ?? undefined,
    plan: tenant.plan ?? undefined,
  }
}

function getStepDefinitions(tenantType: string): StepDefinition[] {
  if (tenantType === 'medical') {
    return [
      { key: 'plan_confirmed', label: 'Plan', title: 'Confirma tu plan', description: 'Valida el plan inicial y el estado de provision de tu cuenta.', href: '/dashboard/settings/subscription' },
      { key: 'branding_configured', label: 'Marca', title: 'Configura branding y portal', description: 'Define nombre comercial, colores y base del portal publico.', href: '/dashboard/settings' },
      { key: 'schedule_configured', label: 'Horarios', title: 'Configura horarios', description: 'Define disponibilidad y condiciones de agenda.', href: '/dashboard/settings' },
      { key: 'whatsapp_mode_selected', label: 'Meta', title: 'Elige tu modo Meta Business', description: 'Selecciona managed shared, numero dedicado o cuenta propia.', href: '/dashboard/integrations' },
      { key: 'google_connected', label: 'Google', title: 'Conecta Google Calendar', description: 'Comparte o conecta el calendario del consultorio.', href: '/dashboard/integrations' },
      { key: 'test_quote_or_appointment', label: 'Prueba', title: 'Haz una prueba', description: 'Prueba el bot o una cita para validar el flujo.', href: '/dashboard' },
      { key: 'public_portal_published', label: 'Publicar', title: 'Publica tu landing', description: 'Verifica y publica la pagina publica del doctor.', href: '/dashboard/settings' },
    ]
  }

  return [
    { key: 'plan_confirmed', label: 'Plan', title: 'Confirma tu plan', description: 'Activa la cuenta y define el plan comercial.', href: '/dashboard/settings/subscription' },
    { key: 'business_configured', label: 'Negocio', title: 'Configura tu negocio', description: 'Carga branding, datos fiscales y contacto.', href: '/dashboard/settings' },
    { key: 'whatsapp_connected', label: 'Canales', title: 'Conecta canales', description: 'Configura WhatsApp e integraciones base.', href: '/dashboard/integrations' },
    { key: 'first_product_or_service', label: 'Catalogo', title: 'Crea tu primer catalogo', description: 'Agrega productos o servicios iniciales.', href: '/dashboard/products' },
    { key: 'test_quote_or_appointment', label: 'Prueba', title: 'Haz una prueba', description: 'Valida la experiencia principal de la cuenta.', href: '/dashboard' },
  ]
}

export async function GET() {
  try {
    const auth = await getAuthTenant()
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const steps = getStepDefinitions(auth.tenant.tenantType ?? 'industrial')
    const [progress] = await db
      .select()
      .from(onboardingProgress)
      .where(eq(onboardingProgress.tenantId, auth.tenant.id))
      .limit(1)

    const stepsCompleted = progress?.stepsJson || {}
    const currentStep = steps.findIndex((step) => !(stepsCompleted as Record<string, boolean | undefined>)[step.key])

    return NextResponse.json({
      completed: !!progress?.completedAt,
      tenantType: auth.tenant.tenantType,
      plan: auth.tenant.plan,
      currentStep: currentStep === -1 ? steps.length : currentStep,
      stepsCompleted,
      steps,
    })
  } catch (err: any) {
    console.error('onboarding GET error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthTenant()
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const patchSchema = z.object({
      stepKey: z.string().min(1).max(100).optional(),
      completed: z.boolean().optional(),
      skipAll: z.boolean().optional(),
    }).strict()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const steps = getStepDefinitions(auth.tenant.tenantType ?? 'industrial')
    const validStepKeys = steps.map((step) => step.key)
    const { stepKey, completed, skipAll } = parsed.data

    const [existing] = await db
      .select()
      .from(onboardingProgress)
      .where(eq(onboardingProgress.tenantId, auth.tenant.id))
      .limit(1)

    const currentSteps = existing?.stepsJson || {}

    if (skipAll) {
      const allDone = Object.fromEntries(validStepKeys.map((key) => [key, true]))

      if (existing) {
        await db
          .update(onboardingProgress)
          .set({
            stepsJson: allDone,
            completedAt: new Date(),
            updatedAt: new Date(),
            vertical: getVerticalContext(auth.tenant),
          })
          .where(eq(onboardingProgress.tenantId, auth.tenant.id))
      } else {
        await db.insert(onboardingProgress).values({
          tenantId: auth.tenant.id,
          stepsJson: allDone,
          completedAt: new Date(),
          vertical: getVerticalContext(auth.tenant),
        })
      }

      return NextResponse.json({ completed: true, stepsCompleted: allDone, steps })
    }

    if (stepKey && validStepKeys.includes(stepKey)) {
      // Server-side validation — mirror of medconcierge onboarding.
      let resolvedCompleted = completed !== false
      if (resolvedCompleted) {
        const validator = STEP_VALIDATORS[stepKey]
        if (validator) {
          const ok = await validator(auth.tenant.id).catch(() => false)
          if (!ok) {
            return NextResponse.json(
              {
                error:
                  'Este paso aún no está realmente completo. Termina la configuración correspondiente antes de marcarlo.',
                code: 'STEP_NOT_DONE',
                stepKey,
              },
              { status: 400 },
            )
          }
        }
      }
      const updatedSteps = { ...currentSteps, [stepKey]: resolvedCompleted }
      const allComplete = validStepKeys.every((key) => (updatedSteps as Record<string, boolean | undefined>)[key] === true)

      if (existing) {
        await db
          .update(onboardingProgress)
          .set({
            stepsJson: updatedSteps,
            completedAt: allComplete ? new Date() : null,
            updatedAt: new Date(),
            vertical: getVerticalContext(auth.tenant),
          })
          .where(eq(onboardingProgress.tenantId, auth.tenant.id))
      } else {
        await db.insert(onboardingProgress).values({
          tenantId: auth.tenant.id,
          stepsJson: updatedSteps,
          completedAt: allComplete ? new Date() : null,
          vertical: getVerticalContext(auth.tenant),
        })
      }

      return NextResponse.json({
        completed: allComplete,
        stepsCompleted: updatedSteps,
        steps,
      })
    }

    return NextResponse.json({ error: 'stepKey o skipAll requerido' }, { status: 400 })
  } catch (err: any) {
    console.error('onboarding PATCH error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
