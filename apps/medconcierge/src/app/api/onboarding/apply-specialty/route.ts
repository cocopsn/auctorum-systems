export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db, tenants } from '@quote-engine/db'
import type { TenantConfig } from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'
import { getSpecialtyTemplate } from '@quote-engine/ai'

const bodySchema = z.object({
  specialtyId: z.string().min(1).max(64),
})

/**
 * POST /api/onboarding/apply-specialty
 *
 * Called during onboarding step 1 when a doctor picks a specialty from the dropdown.
 * Applies ALL template fields (system prompt, bot messages, specialty, services, schedule)
 * and returns the schedule + services so the client can pre-fill steps 2 and 3.
 */
export async function POST(req: NextRequest) {
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let parsed
  try {
    parsed = bodySchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'Datos invalidos' }, { status: 400 })
  }

  const template = getSpecialtyTemplate(parsed.specialtyId)
  if (!template) {
    return NextResponse.json({ error: 'Especialidad no encontrada' }, { status: 404 })
  }

  // Build updated config — apply all template sections
  const config = { ...((auth.tenant.config as TenantConfig) ?? {}) } as Record<string, unknown>

  // AI system prompt
  const ai = { ...((config.ai as Record<string, unknown>) ?? {}) }
  ai.systemPrompt = template.systemPrompt
  if (ai.enabled === undefined) ai.enabled = true
  config.ai = ai

  // Bot messages
  config.bot_messages = template.botMessages

  // Medical specialty
  const medical = { ...((config.medical as Record<string, unknown>) ?? {}) }
  medical.specialty = template.nameEs
  medical.consultation_duration_min = template.suggestedSchedule.consultDuration
  medical.suggested_services = template.services
  config.medical = medical

  // Schedule settings
  const sched = { ...((config.schedule_settings as Record<string, unknown>) ?? {}) }
  sched.weekdays = template.suggestedSchedule.weekdays
  sched.saturday = template.suggestedSchedule.saturday
  sched.sunday = template.suggestedSchedule.sunday
  config.schedule_settings = sched

  // Track template application
  config.applied_specialty_template = {
    id: template.id,
    appliedAt: new Date().toISOString(),
    source: 'onboarding',
  }

  await db
    .update(tenants)
    .set({ config: config as unknown as TenantConfig, updatedAt: new Date() })
    .where(eq(tenants.id, auth.tenant.id))

  // Return schedule + services for client-side pre-fill
  return NextResponse.json({
    ok: true,
    specialtyId: template.id,
    suggestedSchedule: template.suggestedSchedule,
    services: template.services,
  })
}
