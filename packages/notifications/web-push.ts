/**
 * Web Push transport — wraps `web-push` with VAPID config, returns
 * per-subscription delivery results, and never throws on transport failures.
 *
 * Caller is responsible for resolving the list of subscriptions (typically
 * by querying `web_push_subscriptions` from the calling app where drizzle
 * is in scope). Stays dependency-light here so the package can still be
 * imported from any app without dragging the DB layer.
 *
 * The DB cleanup of expired subscriptions (status 404 / 410) is left to the
 * caller — this module returns `{ ok, status, expired, endpoint }` so the
 * caller can decide whether to delete the row.
 */

import webpush from 'web-push'

export type WebPushPayload = {
  title: string
  body: string
  url?: string
  tag?: string
  data?: Record<string, unknown>
  requireInteraction?: boolean
  renotify?: boolean
}

export type WebPushSubscriptionLike = {
  endpoint: string
  p256dh: string
  authKey: string
}

export type WebPushResult = {
  endpoint: string
  ok: boolean
  status?: number
  expired?: boolean
  error?: string
}

let configured = false

function ensureConfigured(): boolean {
  if (configured) return true

  const publicKey = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:contacto@auctorum.com.mx'

  if (!publicKey || !privateKey) return false

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey)
    configured = true
    return true
  } catch (err) {
    console.warn('[web-push] vapid configure failed:', err instanceof Error ? err.message : err)
    return false
  }
}

export function isWebPushConfigured(): boolean {
  return ensureConfigured()
}

export async function sendWebPush(
  subscription: WebPushSubscriptionLike,
  payload: WebPushPayload,
): Promise<WebPushResult> {
  if (!ensureConfigured()) {
    return { endpoint: subscription.endpoint, ok: false, error: 'vapid keys not configured' }
  }

  const subscriptionPayload = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.authKey,
    },
  }

  try {
    const res = await webpush.sendNotification(
      subscriptionPayload,
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24 }, // 24h
    )
    return { endpoint: subscription.endpoint, ok: true, status: res.statusCode }
  } catch (err: any) {
    const status = err?.statusCode as number | undefined
    // 404/410 mean the subscription is dead and should be removed by caller
    const expired = status === 404 || status === 410
    return {
      endpoint: subscription.endpoint,
      ok: false,
      status,
      expired,
      error: err?.message || String(err),
    }
  }
}

export async function sendWebPushBatch(
  subscriptions: WebPushSubscriptionLike[],
  payload: WebPushPayload,
): Promise<{ sent: number; failed: number; expired: WebPushResult[]; results: WebPushResult[] }> {
  let sent = 0
  let failed = 0
  const expired: WebPushResult[] = []
  const results: WebPushResult[] = []

  for (const sub of subscriptions) {
    const result = await sendWebPush(sub, payload)
    results.push(result)
    if (result.ok) sent += 1
    else {
      failed += 1
      if (result.expired) expired.push(result)
    }
  }

  return { sent, failed, expired, results }
}
