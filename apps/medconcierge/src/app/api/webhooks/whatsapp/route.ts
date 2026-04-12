export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { eq, and, gte, asc, sql } from 'drizzle-orm'
import { db, appointments, patients, appointmentEvents } from '@quote-engine/db'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { notifyAppointmentCancelled } from '@/lib/notifications'
import crypto from 'crypto'

// --------------- HMAC Signature Verification ---------------
function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET
  if (!appSecret || appSecret === 'PLACEHOLDER_CONFIGURE_IN_META') {
    return false
  }
  if (!signatureHeader) return false
  const expectedSig =
    'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSig),
      Buffer.from(signatureHeader),
    )
  } catch {
    return false
  }
}

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
  try {
    // Read raw body first for HMAC verification, then parse JSON
    const rawBody = await req.text()
    const signature = req.headers.get('x-hub-signature-256')

    if (!verifyWebhookSignature(rawBody, signature)) {
      console.warn('[whatsapp webhook] invalid HMAC signature')
      return new NextResponse('Invalid signature', { status: 403 })
    }

    const body: WebhookPayload | null = (() => {
      try { return JSON.parse(rawBody) } catch { return null }
    })()

    if (body) {
      processInBackground(body).catch((e) =>
        console.error('[whatsapp webhook] bg error', e),
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[whatsapp webhook] parse error:', error)
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
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

  // FIX 2.3: Resolve tenant_id from the patient first, then filter
  // appointments by tenant_id to prevent cross-tenant data leakage.
  const today = new Date().toISOString().split('T')[0]

  // First find the patient by phone
  const [matchedPatient] = await db
    .select({ id: patients.id, tenantId: patients.tenantId })
    .from(patients)
    .where(
      sql`REGEXP_REPLACE(${patients.phone}, '[^0-9]', '', 'g') LIKE ${'%' + normalized}`,
    )
    .limit(1)

  if (!matchedPatient) {
    return
  }

  // Now find the soonest upcoming scheduled appointment for this patient,
  // scoped to their tenant_id (FIX 2.3 \u2014 tenant isolation).
  const [row] = await db
    .select({ appt: appointments, patient: patients })
    .from(appointments)
    .innerJoin(patients, eq(patients.id, appointments.patientId))
    .where(
      and(
        eq(appointments.patientId, matchedPatient.id),
        eq(appointments.tenantId, matchedPatient.tenantId),
        eq(appointments.status, 'scheduled'),
        gte(appointments.date, today),
      ),
    )
    .orderBy(asc(appointments.date), asc(appointments.startTime))
    .limit(1)

  if (!row) {
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
      'Cancelada por el paciente v\u00eda WhatsApp',
    ).catch((e) => console.error('[webhook cancel] notify failed', e))
    return
  }

  // Other text: log only. Meta template restrictions outside the 24h
  // session window prevent us from sending free-form replies safely.

}
