/**
 * POST /api/dashboard/leads/[id]/convert
 *
 * Convierte un lead en paciente (+ opcionalmente una cita) y avanza el
 * pipeline:
 *
 *   1. Si no existe paciente con (tenant_id, phone), lo crea con name+phone+email.
 *      Si existe, lo reutiliza (uq_patients_tenant_phone es la guarda).
 *   2. Si el body trae { date, startTime, endTime, doctorId }, crea una
 *      cita ligada a ese paciente y al lead.
 *   3. Marca el lead con status='appointed' (si hay cita) o 'converted'
 *      (si solo hay paciente y el body lo pidió).
 *
 * El lead conserva `appointment_id` y `patient_id` para atribución.
 */
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, adLeads, patients, appointments, appointmentEvents } from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'
import { validateOrigin } from '@/lib/csrf'
import { formatPhoneMX } from '@/lib/lead-autocontact'

const schema = z.object({
  patientName: z.string().trim().min(1).max(255).optional(),
  patientPhone: z.string().trim().min(8).max(50).optional(),
  patientEmail: z.string().email().max(255).optional().or(z.literal('')),
  // Si los 4 campos de cita vienen, creamos appointment
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  doctorId: z.string().uuid().optional(),
  reason: z.string().max(500).optional(),
  // Marcar directo como 'converted' (e.g. el paciente ya pagó por otro lado)
  markConverted: z.boolean().optional(),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 })
  }
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }
  const data = parsed.data

  try {
    const [lead] = await db
      .select()
      .from(adLeads)
      .where(and(eq(adLeads.id, params.id), eq(adLeads.tenantId, auth.tenant.id)))
      .limit(1)
    if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const phone = formatPhoneMX(data.patientPhone || lead.phone || '')
    if (!phone) {
      return NextResponse.json({ error: 'Se requiere teléfono del paciente' }, { status: 400 })
    }

    const name = data.patientName?.trim() || lead.name?.trim() || phone
    const email = data.patientEmail?.trim() || lead.email?.trim() || null

    // Reutilizar paciente existente o crear nuevo. uq_patients_tenant_phone
    // garantiza que (tenantId, phone) sea único.
    let patientId: string
    const [existing] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(and(eq(patients.tenantId, auth.tenant.id), eq(patients.phone, phone)))
      .limit(1)

    if (existing) {
      patientId = existing.id
    } else {
      const [created] = await db
        .insert(patients)
        .values({
          tenantId: auth.tenant.id,
          name,
          phone,
          email,
          notes: lead.message ? `Lead inicial: ${lead.message}` : null,
        })
        .returning({ id: patients.id })
      patientId = created.id
    }

    // Si vienen los 4 campos requeridos, crear cita
    let appointmentId: string | null = null
    if (data.date && data.startTime && data.endTime && data.doctorId) {
      const [created] = await db
        .insert(appointments)
        .values({
          tenantId: auth.tenant.id,
          patientId,
          doctorId: data.doctorId,
          date: data.date,
          startTime: data.startTime,
          endTime: data.endTime,
          // Pre-2026-05-10 this used 'pending' which is NOT a valid
          // appointment status (worker filters IN ('scheduled','confirmed')
          // and the agenda + reports filter the same way). Lead-converted
          // appointments were invisible to every downstream consumer.
          status: 'scheduled',
          reason: data.reason || lead.message || null,
          // Source/atribución viven en appointmentEvents.metadata (insert abajo)
          // y en ad_leads.appointmentId — no hace falta una columna dedicada.
        })
        .returning({ id: appointments.id })
      appointmentId = created.id

      await db.insert(appointmentEvents).values({
        appointmentId,
        tenantId: auth.tenant.id,
        eventType: 'created',
        metadata: { source: 'lead_conversion', leadId: lead.id },
      })
    }

    const newStatus = appointmentId ? 'appointed' : data.markConverted ? 'converted' : 'responded'

    const [updatedLead] = await db
      .update(adLeads)
      .set({
        patientId,
        appointmentId,
        status: newStatus,
      })
      .where(and(eq(adLeads.id, lead.id), eq(adLeads.tenantId, auth.tenant.id)))
      .returning()

    return NextResponse.json({
      lead: updatedLead,
      patientId,
      appointmentId,
    })
  } catch (err: any) {
    console.error('[leads convert] error:', err?.message || err)
    // El UNIQUE en (tenant_id, phone) puede fallar si hay race. Devolvemos 409.
    if (typeof err?.message === 'string' && err.message.includes('uq_patients_tenant_phone')) {
      return NextResponse.json({ error: 'Paciente ya existe con ese teléfono' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
