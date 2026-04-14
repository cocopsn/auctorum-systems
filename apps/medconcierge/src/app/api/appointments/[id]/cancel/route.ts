export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { db, appointments, patients, appointmentEvents } from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'
import { notifyAppointmentCancelled } from '@/lib/notifications'

const bodySchema = z.object({
  reason: z.string().max(500).optional(),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const [row] = await db
    .select({ appt: appointments, patient: patients })
    .from(appointments)
    .innerJoin(patients, eq(patients.id, appointments.patientId))
    .where(and(eq(appointments.id, params.id), eq(appointments.tenantId, auth.tenant.id)))
    .limit(1)

  if (!row) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
  if (row.appt.status === 'cancelled') {
    return NextResponse.json({ error: 'Appointment already cancelled' }, { status: 409 })
  }

  await db
    .update(appointments)
    .set({ status: 'cancelled', cancelledAt: new Date() })
    .where(eq(appointments.id, params.id))

  await db.insert(appointmentEvents).values({
    appointmentId: params.id,
    tenantId: auth.tenant.id,
    eventType: 'cancelled',
    metadata: { reason: parsed.data.reason ?? null, source: 'dashboard' },
  })

  // Fire and forget — don't block the response on WhatsApp delivery
  notifyAppointmentCancelled(row.appt, row.patient, auth.tenant.id, parsed.data.reason).catch(
    (e) => {
      console.error('[cancel] notify failed', e)
    },
  )

  return NextResponse.json({ ok: true })

  } catch (err) {
    console.error('[POST]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
