/**
 * GET    /api/dashboard/leads/[id]   → lead + paciente/cita asociados
 * PATCH  /api/dashboard/leads/[id]   → actualizar status o campos editables
 * DELETE /api/dashboard/leads/[id]   → marca como 'lost' (soft — no borra fila)
 */
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, adLeads, patients, appointments, LEAD_STATUSES } from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'
import { validateOrigin } from '@/lib/csrf'

async function loadLead(id: string, tenantId: string) {
  const [row] = await db
    .select()
    .from(adLeads)
    .where(and(eq(adLeads.id, id), eq(adLeads.tenantId, tenantId)))
    .limit(1)
  return row ?? null
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const lead = await loadLead(params.id, auth.tenant.id)
    if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const [patient] = lead.patientId
      ? await db.select().from(patients).where(eq(patients.id, lead.patientId)).limit(1)
      : []
    const [appointment] = lead.appointmentId
      ? await db.select().from(appointments).where(eq(appointments.id, lead.appointmentId)).limit(1)
      : []

    return NextResponse.json({ lead, patient: patient ?? null, appointment: appointment ?? null })
  } catch (err: any) {
    console.error('[leads GET id] error:', err?.message || err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

const patchSchema = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  name: z.string().trim().max(255).optional(),
  phone: z.string().trim().max(50).optional(),
  email: z.string().email().max(255).optional().or(z.literal('')),
  message: z.string().trim().max(2000).optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
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

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: 'no changes' }, { status: 400 })
  }

  try {
    const lead = await loadLead(params.id, auth.tenant.id)
    if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const [updated] = await db
      .update(adLeads)
      .set({
        ...(parsed.data.status !== undefined && { status: parsed.data.status }),
        ...(parsed.data.name !== undefined && { name: parsed.data.name || null }),
        ...(parsed.data.phone !== undefined && { phone: parsed.data.phone || null }),
        ...(parsed.data.email !== undefined && { email: parsed.data.email || null }),
        ...(parsed.data.message !== undefined && { message: parsed.data.message || null }),
      })
      .where(and(eq(adLeads.id, params.id), eq(adLeads.tenantId, auth.tenant.id)))
      .returning()

    return NextResponse.json({ lead: updated })
  } catch (err: any) {
    console.error('[leads PATCH] error:', err?.message || err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 })
  }
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const lead = await loadLead(params.id, auth.tenant.id)
    if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Soft delete: status='lost'. La fila se mantiene para análisis/atribución.
    await db
      .update(adLeads)
      .set({ status: 'lost' })
      .where(and(eq(adLeads.id, params.id), eq(adLeads.tenantId, auth.tenant.id)))

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[leads DELETE] error:', err?.message || err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
