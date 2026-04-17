import { NextRequest, NextResponse } from 'next/server'
import { db, onboardingProgress } from '@quote-engine/db'
import { eq } from 'drizzle-orm'
import { getAuthTenant } from '@/lib/auth'
import { z } from 'zod'

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
      { key: 'plan_confirmed', label: 'Plan', title: 'Confirma tu plan', description: 'Valida el plan inicial y el estado de provision de tu cuenta.', href: '/settings/subscription' },
      { key: 'branding_configured', label: 'Marca', title: 'Configura branding y portal', description: 'Define nombre comercial, colores y base del portal publico.', href: '/portal' },
      { key: 'schedule_configured', label: 'Horarios', title: 'Configura horarios', description: 'Define disponibilidad y condiciones de agenda.', href: '/horarios' },
      { key: 'whatsapp_mode_selected', label: 'Meta', title: 'Elige tu modo Meta Business', description: 'Selecciona managed shared, numero dedicado o cuenta propia.', href: '/integrations' },
      { key: 'google_connected', label: 'Google', title: 'Conecta Google Calendar', description: 'Comparte o conecta el calendario del consultorio.', href: '/integrations' },
      { key: 'test_quote_or_appointment', label: 'Prueba', title: 'Haz una prueba', description: 'Prueba el bot o una cita para validar el flujo.', href: '/agenda' },
      { key: 'public_portal_published', label: 'Publicar', title: 'Publica tu landing', description: 'Verifica y publica la pagina publica del doctor.', href: '/portal' },
    ]
  }

  return [
    { key: 'plan_confirmed', label: 'Plan', title: 'Confirma tu plan', description: 'Activa la cuenta y define el plan comercial.', href: '/settings/subscription' },
    { key: 'business_configured', label: 'Negocio', title: 'Configura tu negocio', description: 'Carga branding, datos fiscales y contacto.', href: '/settings' },
    { key: 'whatsapp_connected', label: 'Canales', title: 'Conecta canales', description: 'Configura WhatsApp e integraciones base.', href: '/integrations' },
    { key: 'first_product_or_service', label: 'Catalogo', title: 'Crea tu primer catalogo', description: 'Agrega productos o servicios iniciales.', href: '/agenda' },
    { key: 'test_quote_or_appointment', label: 'Prueba', title: 'Haz una prueba', description: 'Valida la experiencia principal de la cuenta.', href: '/agenda' },
  ]
}

export async function GET() {
  try {
    const auth = await getAuthTenant()
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const steps = getStepDefinitions(auth.tenant.tenantType ?? 'medical')
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

    const steps = getStepDefinitions(auth.tenant.tenantType ?? 'medical')
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
      const updatedSteps = { ...currentSteps, [stepKey]: completed !== false }
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
