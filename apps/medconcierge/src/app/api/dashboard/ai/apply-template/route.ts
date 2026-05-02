export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db, tenants } from '@quote-engine/db'
import type { TenantConfig } from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'
import { validateOrigin } from '@/lib/csrf'
import { getSpecialtyTemplate } from '@quote-engine/ai'

const bodySchema = z.object({
  specialtyId: z.string().min(1).max(64),
  // What parts of the template to apply. Defaults: systemPrompt + botMessages + specialty.
  // Doctor can opt-in to also apply schedule and services (which would overwrite their data).
  apply: z
    .object({
      systemPrompt: z.boolean().default(true),
      botMessages: z.boolean().default(true),
      specialty: z.boolean().default(true),
      services: z.boolean().default(false),
      schedule: z.boolean().default(false),
    })
    .optional(),
  overwrite: z.boolean().optional().default(false),
})

export async function POST(req: NextRequest) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 })
  }

  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let parsed
  try {
    parsed = bodySchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const template = getSpecialtyTemplate(parsed.specialtyId)
  if (!template) {
    return NextResponse.json({ error: 'Especialidad no encontrada' }, { status: 404 })
  }

  const apply = {
    systemPrompt: parsed.apply?.systemPrompt ?? true,
    botMessages: parsed.apply?.botMessages ?? true,
    specialty: parsed.apply?.specialty ?? true,
    services: parsed.apply?.services ?? false,
    schedule: parsed.apply?.schedule ?? false,
  }

  const config = { ...((auth.tenant.config as TenantConfig) ?? {}) } as Record<string, unknown>
  const overwrite = parsed.overwrite

  // ─── AI system prompt ───
  if (apply.systemPrompt) {
    const ai = { ...((config.ai as Record<string, unknown>) ?? {}) }
    if (overwrite || !ai.systemPrompt || ai.systemPrompt === '') {
      ai.systemPrompt = template.systemPrompt
    }
    // Always ensure ai.enabled defaults to true after applying a template.
    if (ai.enabled === undefined) ai.enabled = true
    config.ai = ai
  }

  // ─── Bot messages ───
  if (apply.botMessages) {
    const existing = (config.bot_messages as Record<string, string>) ?? {}
    config.bot_messages = overwrite
      ? template.botMessages
      : { ...template.botMessages, ...existing }
  }

  // ─── Medical specialty ───
  if (apply.specialty) {
    const medical = { ...((config.medical as Record<string, unknown>) ?? {}) }
    if (overwrite || !medical.specialty) {
      medical.specialty = template.nameEs
    }
    if (overwrite || !medical.consultation_duration_min) {
      medical.consultation_duration_min = template.suggestedSchedule.consultDuration
    }
    config.medical = medical
  }

  // ─── Suggested services (stored under medical.suggested_services) ───
  if (apply.services) {
    const medical = { ...((config.medical as Record<string, unknown>) ?? {}) }
    if (overwrite || !medical.suggested_services) {
      medical.suggested_services = template.services
    }
    config.medical = medical
  }

  // ─── Schedule defaults ───
  if (apply.schedule) {
    const sched = { ...((config.schedule_settings as Record<string, unknown>) ?? {}) }
    if (overwrite || !sched.weekdays) {
      sched.weekdays = template.suggestedSchedule.weekdays
    }
    if (overwrite || !sched.saturday) {
      sched.saturday = template.suggestedSchedule.saturday
    }
    if (overwrite || sched.sunday === undefined) {
      sched.sunday = template.suggestedSchedule.sunday
    }
    config.schedule_settings = sched
  }

  // ─── Track which template was applied (for analytics + future re-apply UX) ───
  config.applied_specialty_template = {
    id: template.id,
    appliedAt: new Date().toISOString(),
    apply,
  }

  await db
    .update(tenants)
    .set({ config: config as unknown as TenantConfig, updatedAt: new Date() })
    .where(eq(tenants.id, auth.tenant.id))

  return NextResponse.json({
    ok: true,
    appliedTemplate: template.id,
    apply,
  })
}
