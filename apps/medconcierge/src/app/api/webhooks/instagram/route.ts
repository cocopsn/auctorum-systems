/**
 * Instagram DM webhook. Meta delivers DMs (`messaging` events) to this
 * endpoint when the IG Business account associated with a Page receives a
 * direct message.
 *
 * Resolution:  page_id (entry.id) → integrations WHERE type='instagram_dm'
 * HMAC:        same META_APP_SECRET (or WHATSAPP_APP_SECRET fallback) used
 *              elsewhere — Meta signs all platform-level events with the
 *              app's secret regardless of product (WA / IG / Lead Ads).
 *
 * Flow per inbound message:
 *   1. Resolve tenant by IG page_id.
 *   2. Upsert conversation by (tenant, channel='instagram', external_id=PSID).
 *      Enrich with sender name on first contact.
 *   3. Persist message (de-dup on external_id — Meta retries).
 *   4. Doctor sees it in /conversaciones and replies manually. AI auto-reply
 *      for IG is intentionally NOT wired yet (worker today only handles WA).
 *
 * Verify (GET): same META_LEADS_VERIFY_TOKEN env (we share verify token
 * across Meta webhooks since Meta only uses it during initial subscription
 * setup, not on per-event auth).
 */
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { and, eq, sql } from 'drizzle-orm'
import {
  db,
  conversations,
  messages,
  integrations,
  tenants,
  type Tenant,
  type InstagramDmConfig,
} from '@quote-engine/db'
import { fetchIgProfile } from '@/lib/instagram'

// ─── HMAC (shared secret with WhatsApp / Meta Ads) ────────────────────────

function verifyMetaSignature(rawBody: string, sig: string | null): boolean {
  const appSecret = process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET
  if (!appSecret || !sig) return false
  const expected =
    'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))
  } catch {
    return false
  }
}

// ─── Tenant resolution ────────────────────────────────────────────────────

async function findTenantByIgPageId(
  pageId: string,
): Promise<{ tenant: Tenant; config: InstagramDmConfig } | null> {
  const rows = await db
    .select({
      tenant: tenants,
      config: integrations.config,
    })
    .from(integrations)
    .innerJoin(tenants, eq(tenants.id, integrations.tenantId))
    .where(
      and(
        eq(integrations.type, 'instagram_dm'),
        sql`${integrations.config}->>'pageId' = ${pageId}`,
      ),
    )
    .limit(1)
  if (rows.length === 0) return null
  return { tenant: rows[0].tenant, config: (rows[0].config ?? {}) as InstagramDmConfig }
}

// ─── GET — Meta verify challenge ───────────────────────────────────────────

export async function GET(req: NextRequest) {
  const verifyToken = process.env.META_LEADS_VERIFY_TOKEN
  if (!verifyToken) return new NextResponse('Not configured', { status: 503 })
  const url = new URL(req.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')
  if (mode === 'subscribe' && token === verifyToken) {
    return new NextResponse(challenge ?? '', { status: 200 })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

// ─── POST — incoming DM events ─────────────────────────────────────────────

type IgMessagingEvent = {
  sender?: { id?: string }
  recipient?: { id?: string }
  timestamp?: number
  message?: {
    mid?: string
    text?: string
    attachments?: Array<{
      type?: string
      payload?: { url?: string }
    }>
    is_echo?: boolean
  }
}

export async function POST(req: NextRequest) {
  let rawBody: string
  try {
    rawBody = await req.text()
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  if (!verifyMetaSignature(rawBody, req.headers.get('x-hub-signature-256'))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
  }

  let body: any
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  // Meta delivers `object: 'instagram'` for IG Business platform events
  if (body?.object !== 'instagram' && body?.object !== 'page') {
    return NextResponse.json({ success: true, ignored: true })
  }

  const summary = { received: 0, persisted: 0, errors: 0 }

  for (const entry of (body.entry ?? []) as any[]) {
    const pageId = String(entry?.id ?? '')
    if (!pageId) {
      summary.errors += 1
      continue
    }

    const resolved = await findTenantByIgPageId(pageId)
    if (!resolved) {
      // Webhook for a page we don't know — log + drop quietly so Meta
      // doesn't keep retrying.
      console.warn(`[instagram] no tenant for page ${pageId}`)
      continue
    }

    const events = (entry.messaging ?? []) as IgMessagingEvent[]
    for (const evt of events) {
      summary.received += 1

      // Skip echoes (messages WE sent — they bounce back through the same hook)
      if (evt.message?.is_echo) continue

      const senderId = evt.sender?.id
      const text = evt.message?.text?.trim()
      const mid = evt.message?.mid

      if (!senderId || (!text && (evt.message?.attachments?.length ?? 0) === 0)) {
        continue
      }

      try {
        // 1. Upsert conversation (tenant, channel, external_id) UNIQUE
        const existing = await db
          .select({ id: conversations.id, unreadCount: conversations.unreadCount })
          .from(conversations)
          .where(
            and(
              eq(conversations.tenantId, resolved.tenant.id),
              eq(conversations.channel, 'instagram'),
              eq(conversations.externalId, senderId),
            ),
          )
          .limit(1)

        let conversationId: string
        if (existing.length === 0) {
          // First DM from this PSID — try to get sender's display name
          const profile = await fetchIgProfile(senderId, resolved.config.accessToken ?? '')
          const [created] = await db
            .insert(conversations)
            .values({
              tenantId: resolved.tenant.id,
              channel: 'instagram',
              externalId: senderId,
              status: 'open',
              unreadCount: 1,
              lastMessageAt: new Date(),
            })
            .returning({ id: conversations.id })
          conversationId = created.id

          // Stash the IG name in the first message metadata; we'll surface
          // it in the inbox UI by reading the latest message of the convo
          // (or the doctor edits the linked client manually).
          if (profile?.name || profile?.username) {
            await db.insert(messages).values({
              conversationId,
              direction: 'inbound',
              senderType: 'system',
              content: `Instagram: @${profile.username || profile.name || senderId}`,
            })
          }
        } else {
          conversationId = existing[0].id
          await db
            .update(conversations)
            .set({
              lastMessageAt: new Date(),
              unreadCount: sql`${conversations.unreadCount} + 1`,
              status: 'open',
              updatedAt: new Date(),
            })
            .where(eq(conversations.id, conversationId))
        }

        // 2. Persist message (de-dup on external_id when Meta retries)
        if (mid) {
          const existingMsg = await db
            .select({ id: messages.id })
            .from(messages)
            .where(eq(messages.externalId, mid))
            .limit(1)
          if (existingMsg.length > 0) continue
        }

        let content = text || ''
        if (!content && evt.message?.attachments?.length) {
          // Surface attachments as bracketed labels
          const labels = evt.message.attachments
            .map((a) => (a.type ? `[${a.type}]` : '[adjunto]'))
            .join(' ')
          content = labels
        }

        await db.insert(messages).values({
          conversationId,
          direction: 'inbound',
          senderType: 'client',
          content,
          externalId: mid ?? null,
          mediaUrl: evt.message?.attachments?.[0]?.payload?.url ?? null,
          mediaType: evt.message?.attachments?.[0]?.type ?? null,
        })

        summary.persisted += 1
      } catch (err) {
        summary.errors += 1
        console.error(
          '[instagram] persist error:',
          err instanceof Error ? err.message : err,
        )
      }
    }
  }

  return NextResponse.json({ success: true, ...summary })
}
