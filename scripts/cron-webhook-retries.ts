/**
 * cron-webhook-retries
 *
 * Picks up rows from `webhook_failures` whose `next_retry_at` is due and
 * re-runs the corresponding handler. Intended cadence: every minute.
 *
 * Pre-2026-05-10 this re-POSTed to the live webhook routes with only an
 * `X-Auctorum-Retry: 1` header that nothing actually checked — every retry
 * landed on a route that demanded a `stripe-signature` / `x-signature`
 * header (which a stored payload doesn't carry) and 400'd. The Meta path
 * also pointed at `/api/wa/webhook` which doesn't exist (real path is per
 * tenant `/api/wa/[slug]/webhook`).
 *
 * Now: the cron sends a shared secret (`WEBHOOK_RETRY_SECRET`) that the
 * routes accept as a bypass for the upstream signature, then process the
 * payload through the same code path. Meta (WhatsApp inbound message)
 * retries are dropped — those go through the BullMQ queue with its own
 * exponential backoff, NOT through this table.
 */

import { processPendingWebhooks } from '@quote-engine/queue'

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'auctorum.com.mx'
const SELF_BASE = process.env.SELF_BASE_URL || `https://med.${APP_DOMAIN}`
const RETRY_SECRET = process.env.WEBHOOK_RETRY_SECRET ?? ''

async function repost(path: string, payload: unknown): Promise<void> {
  if (!RETRY_SECRET) {
    throw new Error('WEBHOOK_RETRY_SECRET not set — cannot retry webhooks safely')
  }
  const res = await fetch(`${SELF_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Auctorum-Retry': '1',
      'X-Auctorum-Retry-Secret': RETRY_SECRET,
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`${path} → ${res.status}: ${text.slice(0, 240)}`)
  }
}

async function main() {
  const start = Date.now()
  // Only Stripe + MercadoPago go through this retry table. WhatsApp message
  // delivery uses BullMQ's `whatsapp_messages` queue with its own retry
  // and DLQ; meta-leads webhook failures DO use this table but go via
  // /api/webhooks/meta-leads (handler not yet wired here — leave for the
  // day that ad-leads ingestion has transient errors worth replaying).
  const result = await processPendingWebhooks(
    {
      stripe:      (payload) => repost('/api/webhooks/stripe', payload),
      mercadopago: (payload) => repost('/api/webhooks/mercadopago', payload),
    },
    25,
  )
  const ms = Date.now() - start
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      action: 'webhook_retry_cycle',
      ms,
      ...result,
    }),
  )
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[cron-webhook-retries] fatal', err)
    process.exit(1)
  })
