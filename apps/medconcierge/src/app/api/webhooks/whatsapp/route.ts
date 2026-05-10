export const dynamic = 'force-dynamic'

/**
 * LEGACY WhatsApp webhook — preserved for tenants whose Meta App is
 * still configured against this URL. The canonical entry point is
 * /api/wa/[slug]/webhook (per-tenant, supports shared-mode env fallback
 * for HMAC + verify_token, see commit 2bb446e May 8 2026). Operationally
 * we keep both alive while we verify nothing is left pointing here;
 * planned deletion when log traffic on this path drops to zero for 7+
 * days.
 */

import { NextRequest, NextResponse } from 'next/server'
import { eq, and, gte, asc, desc, sql, isNull } from 'drizzle-orm'
import {
  db,
  appointments,
  patients,
  appointmentEvents,
  conversations,
  messages,
  clients,
  tenants,
  integrations,
  notifications,
  campaigns,
  campaignMessages,
  type Tenant,
} from '@quote-engine/db'
import { getAiSettings } from '@quote-engine/ai'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { notifyAppointmentCancelled } from '@/lib/notifications'
import {
  isGoogleCalendarConfigured,
  createCalendarEvent,
  cancelCalendarEvent,
} from '@/lib/google-calendar'
import crypto from 'crypto'
import { messageQueue } from '@quote-engine/events'

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
        metadata?: { phone_number_id?: string; display_phone_number?: string }
        messages?: Array<{
          from?: string
          id?: string
          type?: string
          text?: { body?: string }
          timestamp?: string
        }>
        statuses?: Array<{
          id?: string                              // WhatsApp message id (matches campaign_messages.whatsapp_message_id)
          status?: 'sent' | 'delivered' | 'read' | 'failed'
          timestamp?: string
          recipient_id?: string
          errors?: Array<{ title?: string; message?: string; code?: number }>
        }>
      }
    }>
  }>
}

// --------------- Normalize phone helper ---------------
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').replace(/^52/, '')
}

// --------------- Resolve tenant from patient or fallback ---------------
async function resolveTenant(normalized: string, phoneNumberId: string): Promise<{ tenant: Tenant; patientId: string | null; tenantId: string } | null> {
  const [integration] = await db.select({ tenantId: integrations.tenantId })
    .from(integrations)
    .where(and(eq(integrations.type, 'meta'), sql`${integrations.config}->>'phone_number_id' = ${phoneNumberId}`))
    .limit(1);

  if (!integration) return null;
  const tenantId = integration.tenantId;

  const [matchedPatient] = await db
    .select({ id: patients.id })
    .from(patients)
    .where(
      and(
        eq(patients.tenantId, tenantId),
        sql`REGEXP_REPLACE(${patients.phone}, '[^0-9]', '', 'g') LIKE ${'%' + normalized}`
      )
    )
    .limit(1);

  const patientId = matchedPatient ? matchedPatient.id : null;



  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1)

  if (!tenant) return null
  return { tenant, patientId, tenantId }
}

// --------------- Find or create client + conversation ---------------
async function getOrCreateConversation(tenantId: string, phone: string, normalized: string) {
  let [client] = await db
    .select()
    .from(clients)
    .where(
      and(
        eq(clients.tenantId, tenantId),
        sql`REGEXP_REPLACE(${clients.phone}, '[^0-9]', '', 'g') LIKE ${'%' + normalized}`,
      ),
    )
    .limit(1)

  if (!client) {
    const [created] = await db
      .insert(clients)
      .values({
        tenantId,
        name: `WhatsApp ${phone}`,
        phone,
        status: 'lead',
      })
      .returning()
    client = created
  }

  let [conv] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.tenantId, tenantId),
        eq(conversations.clientId, client.id),
        eq(conversations.channel, 'whatsapp'),
        eq(conversations.status, 'open'),
      ),
    )
    .orderBy(desc(conversations.createdAt))
    .limit(1)

  if (!conv) {
    const [created] = await db
      .insert(conversations)
      .values({
        tenantId,
        clientId: client.id,
        channel: 'whatsapp',
        status: 'open',
        lastMessageAt: new Date(),
      })
      .returning()
    conv = created
  }

  return { client, conversation: conv }
}

// --------------- Load message history ---------------
async function loadHistory(conversationId: string, limit = 10) {
  const rows = await db
    .select({ direction: messages.direction, content: messages.content })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(limit)

  return rows.reverse()
}

// --------------- Google Calendar sync helper ---------------
async function syncAppointmentToCalendar(
  appt: { id: string; date: string; startTime: string; endTime: string; reason: string | null },
  patientName: string,
  tenantConfig: Record<string, any>,
) {
  if (!isGoogleCalendarConfigured(tenantConfig)) return
  const autoSync = tenantConfig?.googleCalendar?.autoSync !== false
  if (!autoSync) return

  try {
    const startDateTime = `${appt.date}T${appt.startTime}`
    const endDateTime = `${appt.date}T${appt.endTime}`

    // Pre-2026-05-10 the summary hardcoded "Cita Dermatologia" — every
    // tenant's GCal got polluted with that title regardless of specialty.
    // Now we read tenant.config.medical.specialty (with a generic "Cita"
    // fallback) and the address comes from tenant.config.contact.
    const specialty = (tenantConfig?.medical as Record<string, unknown> | undefined)?.specialty as string | undefined
    const address = (tenantConfig?.contact as Record<string, unknown> | undefined)?.address as string | undefined
    const eventId = await createCalendarEvent(
      {
        summary: specialty ? `Cita ${specialty} - ${patientName}` : `Cita - ${patientName}`,
        description: appt.reason || 'Consulta general',
        startDateTime,
        endDateTime,
        location: address || 'Consultorio',
        reminderMinutes: 60,
      },
      tenantConfig,
    )

    if (eventId) {
      await db.execute(
        sql`UPDATE appointments SET google_event_id = ${eventId} WHERE id = ${appt.id}`,
      )
      console.log('[webhook] appointment synced to Google Calendar:', eventId)
    }
  } catch (e) {
    console.error('[webhook] Google Calendar sync failed (non-blocking):', e)
  }
}

async function removeAppointmentFromCalendar(
  appointmentId: string,
  tenantConfig: Record<string, any>,
) {
  if (!isGoogleCalendarConfigured(tenantConfig)) return

  try {
    const [row] = await db.execute(
      sql`SELECT google_event_id FROM appointments WHERE id = ${appointmentId}`,
    ) as any[]

    const googleEventId = row?.google_event_id
    if (!googleEventId) return

    await cancelCalendarEvent(googleEventId, tenantConfig)
    console.log('[webhook] appointment removed from Google Calendar:', googleEventId)
  } catch (e) {
    console.error('[webhook] Google Calendar removal failed (non-blocking):', e)
  }
}

// --------------- Campaign delivery status updates ---------------
// Meta sends `statuses` updates separately from `messages`. Each status row
// references the WhatsApp message id we got back when we sent — we use it to
// transition the corresponding campaign_messages row through delivered/read/
// failed and to bump the campaign aggregate counters.
async function processCampaignStatuses(body: WebhookPayload): Promise<void> {
  const statuses = body?.entry?.[0]?.changes?.[0]?.value?.statuses
  if (!statuses || statuses.length === 0) return

  for (const s of statuses) {
    const waId = s.id
    const newStatus = s.status
    if (!waId || !newStatus) continue

    // Find the campaign_message this status belongs to (skip for non-campaign messages)
    const [cmRow] = await db
      .select({ id: campaignMessages.id, campaignId: campaignMessages.campaignId })
      .from(campaignMessages)
      .where(eq(campaignMessages.whatsappMessageId, waId))
      .limit(1)
    if (!cmRow) continue

    const updates: Record<string, unknown> = {}
    let counterField: 'delivered' | 'read' | 'failed' | null = null

    if (newStatus === 'delivered') {
      updates.status = 'delivered'
      updates.deliveredAt = new Date()
      counterField = 'delivered'
    } else if (newStatus === 'read') {
      updates.status = 'read'
      updates.readAt = new Date()
      counterField = 'read'
    } else if (newStatus === 'failed') {
      updates.status = 'failed'
      updates.errorMessage =
        s.errors?.[0]?.title || s.errors?.[0]?.message || 'Delivery failed'
      counterField = 'failed'
    } else {
      // 'sent' arrives separately too — we already wrote that on POST send.
      continue
    }

    await db.update(campaignMessages).set(updates).where(eq(campaignMessages.id, cmRow.id))

    // Bump the campaign's stats_json counter atomically
    if (counterField) {
      await db.execute(sql`
        UPDATE campaigns
        SET stats_json = jsonb_set(
          COALESCE(stats_json, '{}'::jsonb),
          ${'{' + counterField + '}'}::text[],
          (COALESCE((stats_json->>${counterField})::int, 0) + 1)::text::jsonb
        ),
        updated_at = NOW()
        WHERE id = ${cmRow.campaignId}
      `)
    }
  }
}

// --------------- Main processing ---------------
async function processInBackground(body: WebhookPayload) {
  // Handle delivery status updates first (separate from message processing).
  // Status updates come without a `messages` array, so the early-return below
  // would skip them otherwise.
  try {
    await processCampaignStatuses(body)
  } catch (e) {
    console.error('[webhook] Campaign status processing failed (non-blocking):', e)
  }

  const value = body?.entry?.[0]?.changes?.[0]?.value
  const message = value?.messages?.[0]
  if (!message || message.type !== 'text') return

  const from = message.from ?? ''
  const originalText = (message.text?.body ?? '').trim()
  const text = originalText.toUpperCase()
  if (!from || !text) return

  const normalized = normalizePhone(from)
  if (!normalized) return

  const externalId = message.id ?? null
  const phoneNumberId = value?.metadata?.phone_number_id as string | undefined

  if (!phoneNumberId) {
    console.log('[whatsapp webhook] Missing phone_number_id in metadata');
    return;
  }

  const resolved = await resolveTenant(normalized, phoneNumberId);
  if (!resolved) {
    console.warn(`[whatsapp webhook] unmapped phone_number_id ${phoneNumberId}`);
    return;
  }

  // --- Try appointment keyword handling first inline (fast) ---
  const appointmentHandled = await handleAppointmentKeyword(from, normalized, text, phoneNumberId)
  if (appointmentHandled) return

  // --- Push AI concierge to background worker queue ---
  const timestamp = message.timestamp as string | undefined;
  
  await messageQueue.add('incoming_message', {
    tenantId: resolved.tenantId,
    phone: from,
    phoneNumberId,
    text: originalText,
    externalId,
    timestamp
  });

  console.log(`[whatsapp webhook] enqueued message ${externalId} for tenant ${resolved.tenantId}`);
}

async function handleAppointmentKeyword(from: string, normalized: string, text: string, phoneNumberId: string): Promise<boolean> {
  const CONFIRM_KEYWORDS = ['CONFIRMO', 'CONFIRMAR', 'SI']
  const CANCEL_KEYWORDS = ['CANCELO', 'CANCELAR', 'NO']

  if (![...CONFIRM_KEYWORDS, ...CANCEL_KEYWORDS].includes(text)) {
    return false
  }

  const today = new Date().toISOString().split('T')[0]

  const resolved = await resolveTenant(normalized, phoneNumberId);
  if (!resolved) return false;
  const matchedPatient = resolved.patientId ? { id: resolved.patientId, tenantId: resolved.tenantId } : null;

  if (!matchedPatient) return false

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, matchedPatient.tenantId))
    .limit(1)
  const tenantConfig = (tenant?.config as Record<string, any>) || {}

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

  if (!row) return false

  if (CONFIRM_KEYWORDS.includes(text)) {
    await db
      .update(appointments)
      .set({ confirmedByPatient: true, confirmedAt: new Date() })
      .where(eq(appointments.id, row.appt.id))

    await db.insert(appointmentEvents).values({
      appointmentId: row.appt.id,
      tenantId: row.appt.tenantId,
      eventType: 'confirmed_by_patient',
      metadata: { source: 'whatsapp_inbound', text },
    })

    syncAppointmentToCalendar(row.appt, row.patient.name, tenantConfig).catch((e) =>
      console.error('[webhook] gcal sync error:', e),
    )

    // Create notification for doctor
    await db.insert(notifications).values({
      tenantId: row.appt.tenantId,
      type: 'confirmed_appointment',
      title: 'Cita confirmada',
      message: `${row.patient.name} confirmo su cita del ${row.appt.date} a las ${row.appt.startTime.slice(0, 5)}`,
    }).catch((err) => { console.error('Notification insert failed:', err) })

    await sendWhatsAppMessage(from, 'Gracias, su cita queda confirmada.')
    return true
  }

  if (CANCEL_KEYWORDS.includes(text)) {
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

    removeAppointmentFromCalendar(row.appt.id, tenantConfig).catch((e) =>
      console.error('[webhook] gcal removal error:', e),
    )

    // Create notification for doctor
    await db.insert(notifications).values({
      tenantId: row.appt.tenantId,
      type: 'cancelled_appointment',
      title: 'Cita cancelada',
      message: `${row.patient.name} cancelo su cita del ${row.appt.date} a las ${row.appt.startTime.slice(0, 5)}`,
    }).catch((err) => { console.error('Notification insert failed:', err) })

    notifyAppointmentCancelled(
      row.appt,
      row.patient,
      row.appt.tenantId,
      'Cancelada por el paciente via WhatsApp',
    ).catch((e) => console.error('[webhook cancel] notify failed', e))
    return true
  }

  return false
}

