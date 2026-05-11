/**
 * Campaign worker — processes BullMQ jobs from the `whatsapp_campaigns` queue.
 *
 * One job per campaign. The worker drains all `campaign_messages` rows for
 * that campaign with status='queued', sending each via the WhatsApp Cloud API
 * with a 45s pause between sends to stay under Meta's WABA marketing rate
 * limit (~80 messages / hour for newer numbers).
 *
 * Run: npx tsx scripts/campaign-worker.ts
 * PM2: separate process, concurrency 1 (one campaign at a time across all
 *      tenants so we don't accidentally exceed marketing limits in aggregate).
 */

import { createWorker, getConnection, type Job } from '../packages/queue/src/index'
import {
  db,
  campaigns,
  campaignMessages,
  tenants,
  botInstances,
} from '../packages/db/index'
import { and, eq, sql } from 'drizzle-orm'
import { checkAndTrackUsage } from '../packages/ai/index'

const WHATSAPP_API_URL = 'https://graph.facebook.com/v19.0'
const SEND_INTERVAL_MS = 45_000 // 45s between sends → ~80 / hour (safely under Meta's 80/h marketing limit)

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('52') && digits.length >= 12) return digits
  if (digits.length === 10) return `52${digits}`
  return digits
}

async function getPhoneNumberIdForTenant(tenantId: string): Promise<string | null> {
  const [bot] = await db
    .select({ config: botInstances.config })
    .from(botInstances)
    .where(
      and(
        eq(botInstances.tenantId, tenantId),
        eq(botInstances.channel, 'whatsapp'),
        eq(botInstances.status, 'active'),
      ),
    )
    .limit(1)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (bot?.config as any)?.phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID || null
}

interface SendResult {
  ok: boolean
  whatsappMessageId?: string
  errorMessage?: string
}

async function sendOne(
  phoneNumberId: string,
  token: string,
  to: string,
  body: string,
): Promise<SendResult> {
  try {
    const res = await fetch(`${WHATSAPP_API_URL}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: normalizePhone(to),
        type: 'text',
        text: { body },
      }),
    })

    const json = (await res.json().catch(() => ({}))) as {
      messages?: Array<{ id: string }>
      error?: { message?: string; code?: number; error_subcode?: number }
    }

    if (res.ok && json.messages && json.messages[0]?.id) {
      return { ok: true, whatsappMessageId: json.messages[0].id }
    }
    return {
      ok: false,
      errorMessage: json.error?.message || `HTTP ${res.status}`,
    }
  } catch (err) {
    return {
      ok: false,
      errorMessage: err instanceof Error ? err.message : String(err),
    }
  }
}

async function processCampaign(job: Job): Promise<void> {
  const { campaignId, tenant_id: tenantId } = job.data as {
    campaignId: string
    tenant_id: string
  }

  if (!campaignId || !tenantId) {
    console.error('[campaign-worker] Missing campaignId/tenantId in job data:', job.data)
    return
  }

  // Verify campaign exists and is in a sendable state
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.tenantId, tenantId)))
    .limit(1)

  if (!campaign) {
    console.warn(`[campaign-worker] Campaign ${campaignId} not found, skipping`)
    return
  }
  if (campaign.status !== 'sending') {
    console.warn(
      `[campaign-worker] Campaign ${campaignId} status=${campaign.status}, skipping (will not resume cancelled/completed)`,
    )
    return
  }

  // Resolve WhatsApp credentials
  const token = process.env.WHATSAPP_TOKEN
  if (!token) {
    console.error('[campaign-worker] WHATSAPP_TOKEN not set, marking campaign failed')
    await db
      .update(campaigns)
      .set({ status: 'failed', updatedAt: new Date(), completedAt: new Date() })
      .where(eq(campaigns.id, campaignId))
    return
  }
  const phoneNumberId = await getPhoneNumberIdForTenant(tenantId)
  if (!phoneNumberId) {
    console.error(`[campaign-worker] No phone_number_id for tenant ${tenantId}, failing campaign`)
    await db
      .update(campaigns)
      .set({ status: 'failed', updatedAt: new Date(), completedAt: new Date() })
      .where(eq(campaigns.id, campaignId))
    return
  }

  // Get tenant for record-keeping (e.g. business name for logging)
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1)
  console.log(`[campaign-worker] BEGIN campaign=${campaignId} tenant=${tenant?.slug || tenantId}`)

  // Drain queued messages
  let sentCount = 0
  let failedCount = 0
  let processed = 0

  // Loop instead of fetching all upfront — supports pause/cancel mid-flight.
  while (true) {
    // Re-check campaign status each iteration so a Cancel from the UI
    // halts the worker gracefully.
    const [current] = await db
      .select({ status: campaigns.status })
      .from(campaigns)
      .where(eq(campaigns.id, campaignId))
      .limit(1)
    if (!current || current.status !== 'sending') {
      console.log(`[campaign-worker] Campaign ${campaignId} no longer sending (${current?.status}), stopping`)
      break
    }

    const [next] = await db
      .select()
      .from(campaignMessages)
      .where(
        and(
          eq(campaignMessages.campaignId, campaignId),
          eq(campaignMessages.status, 'queued'),
        ),
      )
      .orderBy(campaignMessages.createdAt)
      .limit(1)

    if (!next) break

    const phone = next.phone || ''
    const body = next.messageBody || ''
    if (!phone || !body) {
      await db
        .update(campaignMessages)
        .set({
          status: 'failed',
          errorMessage: 'Missing phone or message body',
        })
        .where(eq(campaignMessages.id, next.id))
      failedCount++
      processed++
      continue
    }

    // Per-tenant WhatsApp quota gate. Pre-2026-05-11 campaigns ignored
    // the plan cap — a rogue or buggy tenant could blast through tens of
    // thousands of marketing conversations and our Meta bill would tell
    // us about it next month. Now: before each send we increment 1 against
    // the tenant's `whatsapp_messages` allowance; if denied, the campaign
    // is paused (`paused_limit`) so the operator can decide whether to
    // upgrade the plan or wait for the period to reset.
    try {
      const usage = await checkAndTrackUsage(
        tenantId,
        (tenant?.plan ?? 'basico') as string,
        'whatsapp_messages',
        1,
      )
      if (!usage.allowed) {
        console.warn(
          `[campaign-worker] tenant=${tenantId} over WhatsApp cap (${usage.current}/${usage.totalLimit}), pausing campaign=${campaignId}`,
        )
        await db
          .update(campaigns)
          .set({ status: 'paused_limit', updatedAt: new Date() })
          .where(eq(campaigns.id, campaignId))
        break
      }
    } catch (err) {
      console.warn('[campaign-worker] usage gate threw (continuing best-effort):', err instanceof Error ? err.message : err)
    }

    const result = await sendOne(phoneNumberId, token, phone, body)
    if (result.ok) {
      await db
        .update(campaignMessages)
        .set({
          status: 'sent',
          whatsappMessageId: result.whatsappMessageId ?? null,
          sentAt: new Date(),
        })
        .where(eq(campaignMessages.id, next.id))
      sentCount++
    } else {
      await db
        .update(campaignMessages)
        .set({
          status: 'failed',
          errorMessage: result.errorMessage?.slice(0, 500) ?? 'unknown error',
        })
        .where(eq(campaignMessages.id, next.id))
      failedCount++
    }
    processed++

    // Update campaign aggregate counts
    await db.execute(sql`
      UPDATE campaigns
      SET messages_sent = ${sentCount},
          messages_failed = ${failedCount},
          stats_json = jsonb_set(
            jsonb_set(
              COALESCE(stats_json, '{}'::jsonb),
              '{sent}', ${sentCount}::text::jsonb
            ),
            '{failed}', ${failedCount}::text::jsonb
          ),
          updated_at = NOW()
      WHERE id = ${campaignId}
    `)

    // Rate limit between sends (skip after the last one — we'll exit the loop next iter)
    if (next) {
      await new Promise((resolve) => setTimeout(resolve, SEND_INTERVAL_MS))
    }
  }

  // Mark campaign completed
  await db
    .update(campaigns)
    .set({
      status: sentCount === 0 && failedCount > 0 ? 'failed' : 'completed',
      messagesSent: sentCount,
      messagesFailed: failedCount,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(campaigns.id, campaignId))

  console.log(
    `[campaign-worker] DONE campaign=${campaignId} processed=${processed} sent=${sentCount} failed=${failedCount}`,
  )
}

// --------------- Boot ---------------

console.log('[campaign-worker] Starting WhatsApp campaign worker...')
console.log(`[campaign-worker] Send interval: ${SEND_INTERVAL_MS / 1000}s/msg (~${Math.floor(3600_000 / SEND_INTERVAL_MS)} msgs/hour)`)

const worker = createWorker('whatsapp_campaigns', processCampaign, 1)

worker.on('failed', (job, err) => {
  console.error(`[campaign-worker] Job ${job?.id} FAILED:`, err.message)
})
worker.on('completed', (job) => {
  console.log(`[campaign-worker] Job ${job.id} completed`)
})

console.log('[campaign-worker] Ready, waiting for jobs on queue: whatsapp_campaigns')

// Graceful shutdown
async function shutdown() {
  console.log('[campaign-worker] Shutting down...')
  await worker.close()
  const conn = getConnection()
  await conn.quit()
  process.exit(0)
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
