export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { db, appointments, patients, type TenantConfig } from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

const bodySchema = z.object({
  type: z.enum(['24h', '2h']),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  // Fetch appointment + patient, scoped to tenant
  const [row] = await db
    .select({ appt: appointments, patient: patients })
    .from(appointments)
    .innerJoin(patients, eq(patients.id, appointments.patientId))
    .where(and(eq(appointments.id, params.id), eq(appointments.tenantId, auth.tenant.id)))
    .limit(1)

  if (!row) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })

  const config = auth.tenant.config as TenantConfig
  const displayDate = new Date(row.appt.date + 'T12:00:00').toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const displayTime = row.appt.startTime.slice(0, 5)
  const address = config.contact?.address ?? 'Consultar con el consultorio'

  const message =
    parsed.data.type === '24h'
      ? [
          `*Recordatorio de cita*`,
          ``,
          `Hola ${row.patient.name}, le recordamos su cita el ${displayDate} a las ${displayTime} con ${auth.tenant.name}.`,
          ``,
          `Direccion: ${address}`,
          ``,
          `Responda CONFIRMO para confirmar o CANCELO para cancelar.`,
        ].join('\n')
      : [
          `*Recordatorio: su cita es en 2 horas*`,
          ``,
          `${row.patient.name}, su cita con ${auth.tenant.name} es hoy a las ${displayTime}.`,
          ``,
          `Direccion: ${address}`,
        ].join('\n')

  const ok = await sendWhatsAppMessage(row.patient.phone, message)
  if (!ok) {
    return NextResponse.json(
      { error: 'WhatsApp send failed (revisa credenciales)' },
      { status: 502 },
    )
  }

  // Update reminder flag
  const updateData =
    parsed.data.type === '24h'
      ? { reminder24hSent: true, reminder24hSentAt: new Date() }
      : { reminder2hSent: true, reminder2hSentAt: new Date() }

  await db.update(appointments).set(updateData).where(eq(appointments.id, params.id))

  return NextResponse.json({ ok: true, type: parsed.data.type })
}
