/**
 * cron-webhook-retries
 *
 * Picks up rows from `webhook_failures` whose `next_retry_at` is due and
 * re-runs the corresponding handler. Intended cadence: every minute.
 *
 * The processors here intentionally *re-post* to our own webhook routes
 * over the loopback. That keeps the logic in a single place (the route
 * handler) and avoids drifting two implementations.
 */

import { processPendingWebhooks } from '@quote-engine/queue'

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'auctorum.com.mx'
const SELF_BASE = process.env.SELF_BASE_URL || `https://portal.${APP_DOMAIN}`

async function repost(path: string, payload: unknown): Promise<void> {
  // We send the payload as if Stripe/MP just delivered it. The retry path
  // is meant for transient failures *after* signature verification, so
  // re-posting without the original headers is acceptable: the route's
  // own retry guard (idempotency keys, dedup on payment id) handles the
  // case where the original delivery actually succeeded but the response
  // never made it back to the upstream.
  const res = await fetch(`${SELF_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Auctorum-Retry': '1' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`${path} → ${res.status}: ${text.slice(0, 240)}`)
  }
}

async function main() {
  const start = Date.now()
  const result = await processPendingWebhooks(
    {
      stripe:      (payload) => repost('/api/webhooks/stripe', payload),
      mercadopago: (payload) => repost('/api/webhooks/mercadopago', payload),
      meta:        (payload) => repost('/api/wa/webhook', payload),
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
