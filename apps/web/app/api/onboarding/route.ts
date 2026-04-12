import { NextRequest, NextResponse } from 'next/server'
import { db, onboardingProgress, tenants } from '@quote-engine/db'
import { eq } from 'drizzle-orm'
import { getAuthTenant } from '@/lib/auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const auth = await getAuthTenant()
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const [progress] = await db
      .select()
      .from(onboardingProgress)
      .where(eq(onboardingProgress.tenantId, auth.tenant.id))
      .limit(1)

    if (!progress) {
      return NextResponse.json({
        completed: false,
        currentStep: 0,
        stepsCompleted: {
          business_configured: false,
          whatsapp_connected: false,
          first_product_or_service: false,
          schedule_configured: false,
          test_quote_or_appointment: false,
        },
      })
    }

    return NextResponse.json({
      completed: !!progress.completedAt,
      currentStep: Object.values(progress.stepsJson || {}).filter(Boolean).length,
      stepsCompleted: progress.stepsJson || {},
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
    const { stepKey, completed, skipAll } = parsed.data

    const [existing] = await db
      .select()
      .from(onboardingProgress)
      .where(eq(onboardingProgress.tenantId, auth.tenant.id))
      .limit(1)

    const currentSteps = existing?.stepsJson || {}

    if (skipAll) {
      // Mark all complete
      const allDone = {
        business_configured: true,
        whatsapp_connected: true,
        first_product_or_service: true,
        schedule_configured: true,
        test_quote_or_appointment: true,
      }

      if (existing) {
        await db
          .update(onboardingProgress)
          .set({
            stepsJson: allDone,
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(onboardingProgress.tenantId, auth.tenant.id))
      } else {
        await db.insert(onboardingProgress).values({
          tenantId: auth.tenant.id,
          stepsJson: allDone,
          completedAt: new Date(),
        })
      }

      return NextResponse.json({ completed: true, stepsCompleted: allDone })
    }

    if (stepKey) {
      const updatedSteps = { ...currentSteps, [stepKey]: completed !== false }

      const allStepKeys = [
        'business_configured',
        'whatsapp_connected',
        'first_product_or_service',
        'schedule_configured',
        'test_quote_or_appointment',
      ]
      const allComplete = allStepKeys.every(k => (updatedSteps as any)[k] === true)

      if (existing) {
        await db
          .update(onboardingProgress)
          .set({
            stepsJson: updatedSteps,
            completedAt: allComplete ? new Date() : null,
            updatedAt: new Date(),
          })
          .where(eq(onboardingProgress.tenantId, auth.tenant.id))
      } else {
        await db.insert(onboardingProgress).values({
          tenantId: auth.tenant.id,
          stepsJson: updatedSteps,
          completedAt: allComplete ? new Date() : null,
        })
      }

      return NextResponse.json({
        completed: allComplete,
        stepsCompleted: updatedSteps,
      })
    }

    return NextResponse.json({ error: 'stepKey o skipAll requerido' }, { status: 400 })
  } catch (err: any) {
    console.error('onboarding PATCH error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
