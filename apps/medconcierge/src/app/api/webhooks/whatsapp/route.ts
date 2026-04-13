export const dynamic = 'force-dynamic'

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
  type Tenant,
} from '@quote-engine/db'
import { getAiSettings, runWhatsAppReply } from '@quote-engine/ai'
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
          id?: string
          type?: string
          text?: { body?: string }
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
async function resolveTenant(normalized: string): Promise<{ tenant: Tenant; patientId: string | null; tenantId: string } | null> {
  // Try to find a patient by phone number
  const [matchedPatient] = await db
    .select({ id: patients.id, tenantId: patients.tenantId })
    .from(patients)
    .where(
      sql`REGEXP_REPLACE(${patients.phone}, '[^0-9]', '', 'g') LIKE ${'%' + normalized}`,
    )
    .limit(1)

  let tenantId: string
  let patientId: string | null = null

  if (matchedPatient) {
    tenantId = matchedPatient.tenantId
    patientId = matchedPatient.id
  } else {
    // No patient found — find the first active tenant with medical config
    const [medTenant] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(
        and(
          eq(tenants.isActive, true),
          isNull(tenants.deletedAt),
          sql`(${tenants.config}::jsonb)->'medical' IS NOT NULL`,
        ),
      )
      .limit(1)

    if (!medTenant) return null
    tenantId = medTenant.id
  }

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
  // Find or create a client record for this phone number
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

  // Find or create an open conversation
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

  // Reverse so oldest is first
  return rows.reverse()
}

// --------------- Main processing ---------------
async function processInBackground(body: WebhookPayload) {
  const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
  if (!message || message.type !== 'text') return

  const from = message.from ?? ''
  const originalText = (message.text?.body ?? '').trim()
  const text = originalText.toUpperCase()
  if (!from || !text) return

  const normalized = normalizePhone(from)
  if (!normalized) return

  const externalId = message.id ?? null

  // --- Try appointment keyword handling first ---
  const appointmentHandled = await handleAppointmentKeyword(from, normalized, text)
  if (appointmentHandled) return

  // --- AI concierge for all other messages ---
  await handleAiReply(from, normalized, originalText, externalId)
}

// --------------- Appointment keyword handler (existing logic) ---------------
async function handleAppointmentKeyword(from: string, normalized: string, text: string): Promise<boolean> {
  const CONFIRM_KEYWORDS = ['CONFIRMO', 'CONFIRMAR', 'SI']
  const CANCEL_KEYWORDS = ['CANCELO', 'CANCELAR', 'NO']

  if (![...CONFIRM_KEYWORDS, ...CANCEL_KEYWORDS].includes(text)) {
    return false
  }

  const today = new Date().toISOString().split('T')[0]

  const [matchedPatient] = await db
    .select({ id: patients.id, tenantId: patients.tenantId })
    .from(patients)
    .where(
      sql`REGEXP_REPLACE(${patients.phone}, '[^0-9]', '', 'g') LIKE ${'%' + normalized}`,
    )
    .limit(1)

  if (!matchedPatient) return false

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

    notifyAppointmentCancelled(
      row.appt,
      row.patient,
      row.appt.tenantId,
      'Cancelada por el paciente vía WhatsApp',
    ).catch((e) => console.error('[webhook cancel] notify failed', e))
    return true
  }

  return false
}

// --------------- AI reply handler ---------------
async function handleAiReply(from: string, normalized: string, originalText: string, externalId: string | null) {
  try {
    // Resolve tenant
    const resolved = await resolveTenant(normalized)
    if (!resolved) {
      console.log('[whatsapp ai] no tenant found for phone', normalized)
      return
    }

    const { tenant, tenantId } = resolved
    const settings = getAiSettings(tenant)

    if (!settings.enabled) {
      console.log('[whatsapp ai] AI disabled for tenant', tenant.slug)
      return
    }

    // Get or create conversation
    const { conversation } = await getOrCreateConversation(tenantId, from, normalized)

    // Check if bot is paused (human takeover)
    if (conversation.botPaused) {
      console.log('[whatsapp ai] bot paused for conversation', conversation.id)
      // Still save inbound message for the dashboard
      await db.insert(messages).values({
        conversationId: conversation.id,
        direction: 'inbound',
        senderType: 'client',
        content: originalText,
        externalId,
      })
      await db
        .update(conversations)
        .set({ lastMessageAt: new Date(), unreadCount: sql`${conversations.unreadCount} + 1`, updatedAt: new Date() })
        .where(eq(conversations.id, conversation.id))
      return
    }

    // Save inbound message
    await db.insert(messages).values({
      conversationId: conversation.id,
      direction: 'inbound',
      senderType: 'client',
      content: originalText,
      externalId,
    })

    // Load conversation history (last 10 messages BEFORE this one)
    const history = await loadHistory(conversation.id, 10)

    // Call OpenAI
    console.log('[whatsapp ai] calling OpenAI for', tenant.slug, 'from', normalized)
    const { answer, model, latencyMs } = await runWhatsAppReply({
      tenant,
      messageHistory: history,
      incomingMessage: originalText,
    })
    console.log('[whatsapp ai] OpenAI responded in', latencyMs, 'ms, model:', model)

    // Save outbound message
    await db.insert(messages).values({
      conversationId: conversation.id,
      direction: 'outbound',
      senderType: 'bot',
      content: answer,
    })

    // Update conversation metadata
    await db
      .update(conversations)
      .set({ lastMessageAt: new Date(), updatedAt: new Date() })
      .where(eq(conversations.id, conversation.id))

    // Send via WhatsApp
    const sent = await sendWhatsAppMessage(from, answer)
    if (!sent) {
      console.error('[whatsapp ai] failed to send WhatsApp message to', from)
    }
  } catch (error) {
    console.error('[whatsapp ai] error:', error)
  }
}
