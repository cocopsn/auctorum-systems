export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq, and, ne, notInArray } from 'drizzle-orm'
import { db, appointments, patients, appointmentEvents } from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'
import { notifyAppointmentRescheduled } from '@/lib/notifications'

const bodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { date, startTime, endTime } = parsed.data

  try {
    const result = await db.transaction(async (tx) => {
      // Lock the current appointment row
      const [current] = await tx
        .select({ appt: appointments, patient: patients })
        .from(appointments)
        .innerJoin(patients, eq(patients.id, appointments.patientId))
        .where(
          and(eq(appointments.id, params.id), eq(appointments.tenantId, auth.tenant.id)),
        )
        .for('update')
        .limit(1)

      if (!current) throw new Error('NOT_FOUND')
      if (current.appt.status === 'cancelled') throw new Error('CANCELLED')

      // Check destination slot is free (excluding our own row)
      const conflicts = await tx
        .select({ id: appointments.id })
        .from(appointments)
        .where(
          and(
            eq(appointments.tenantId, auth.tenant.id),
            eq(appointments.date, date),
            eq(appointments.startTime, startTime),
            ne(appointments.id, params.id),
            notInArray(appointments.status, ['cancelled', 'rescheduled']),
          ),
        )
        .for('update')
        .limit(1)

      if (conflicts.length > 0) throw new Error('SLOT_TAKEN')

      const oldDate = current.appt.date
      const oldStartTime = current.appt.startTime

      // Mutate in place. Reset reminder + confirmation flags so the
      // existing CP5 cron re-sends 24h/2h reminders for the new slot.
      const [updated] = await tx
        .update(appointments)
        .set({
          date,
          startTime,
          endTime,
          reminder24hSent: false,
          reminder24hSentAt: null,
          reminder2hSent: false,
          reminder2hSentAt: null,
          confirmedByPatient: false,
          confirmedAt: null,
        })
        .where(eq(appointments.id, params.id))
        .returning()

      await tx.insert(appointmentEvents).values({
        appointmentId: params.id,
        tenantId: auth.tenant.id,
        eventType: 'rescheduled',
        metadata: {
          from: { date: oldDate, startTime: oldStartTime },
          to: { date, startTime, endTime },
          source: 'dashboard',
        },
      })

      return { updated, patient: current.patient, oldDate, oldStartTime }
    })

    notifyAppointmentRescheduled(
      result.updated,
      result.patient,
      auth.tenant.id,
      result.oldDate,
      result.oldStartTime,
    ).catch((e) => console.error('[reschedule] notify failed', e))

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    if (msg === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }
    if (msg === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Cita cancelada, no se puede reagendar' },
        { status: 409 },
      )
    }
    if (msg === 'SLOT_TAKEN') {
      return NextResponse.json(
        { error: 'El horario ya no está disponible' },
        { status: 409 },
      )
    }
    console.error('[reschedule] error', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
