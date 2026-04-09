export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { eq, and, gte, asc, sql } from 'drizzle-orm'
import { db, appointments, patients, appointmentEvents } from '@quote-engine/db'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { notifyAppointmentCancelled } from '@/lib/notifications'

// GET: Meta verification challenge
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

// POST: incoming messages
export async function POST(req: NextRequest) {
  // ACK 200 immediately — Meta requires a fast response
  const body = await req.json().catch(() => null)

  if (body) {
    processInBackground(body).catch((e) =>
      console.error('[whatsapp webhook] bg error', e),
    )
  }

  return NextResponse.json({ ok: true })
}

type WebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          from?: string
          type?: string
          text?: { body?: string }
        }>
      }
    }>
  }>
}

async function processInBackground(body: WebhookPayload) {
  const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
  if (!message || message.type !== 'text') return

  const from = message.from ?? ''
  const text = (message.text?.body ?? '').trim().toUpperCase()
  if (!from || !text) return

  // Normalize: strip non-digits, drop leading 52 (MX country code).
  // Same technique as apps/web webhook.
  const normalized = from.replace(/\D/g, '').replace(/^52/, '')
  if (!normalized) return

  // Find soonest upcoming scheduled appointment for this phone (cross-tenant).
  // Phones in patients are stored without country code (lib/appointments.ts
  // normalizes via .slice(-10)) so a suffix LIKE match handles both.
  const today = new Date().toISOString().split('T')[0]
  const [row] = await db
    .select({ appt: appointments, patient: patients })
    .from(appointments)
    .innerJoin(patients, eq(patients.id, appointments.patientId))
    .where(
      and(
        sql`REGEXP_REPLACE(${patients.phone}, '[^0-9]', '', 'g') LIKE ${
          '%' + normalized
        }`,
        eq(appointments.status, 'scheduled'),
        gte(appointments.date, today),
      ),
    )
    .orderBy(asc(appointments.date), asc(appointments.startTime))
    .limit(1)

  if (!row) {
    console.log(
      `[whatsapp webhook] no scheduled appointment for normalized=${normalized}`,
    )
    return
  }

  if (text === 'CONFIRMO' || text === 'CONFIRMAR' || text === 'SI') {
    await db
      .update(appointments)
      .set({
        confirmedByPatient: true,
        confirmedAt: new Date(),
      })
      .where(eq(appointments.id, row.appt.id))

    await db.insert(appointmentEvents).values({
      appointmentId: row.appt.id,
      tenantId: row.appt.tenantId,
      eventType: 'confirmed_by_patient',
      metadata: { source: 'whatsapp_inbound', text },
    })

    await sendWhatsAppMessage(from, 'Gracias, su cita queda confirmada.')
    return
  }

  if (text === 'CANCELO' || text === 'CANCELAR' || text === 'NO') {
    await db
      .update(appointments)
      .set({ status: 'cancelled', cancelledAt: new Date() })
      .where(eq(appointments.id, row.appt.id))

    await db.insert(appointmentEvents).values({
      appointmentId: row.appt.id,
      tenantId: row.appt.tenantId,
      eventType: 'cancelled',
      metadata: { source: 'whatsapp_inbound', text },
    })

    notifyAppointmentCancelled(
      row.appt,
      row.patient,
      row.appt.tenantId,
      'Cancelada por el paciente vía WhatsApp',
    ).catch((e) => console.error('[webhook cancel] notify failed', e))
    return
  }

  // Other text: log only. Meta template restrictions outside the 24h
  // session window prevent us from sending free-form replies safely.
  console.log(
    `[whatsapp webhook] unhandled text from ${normalized}: "${text}"`,
  )
}
