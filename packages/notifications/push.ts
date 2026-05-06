/**
 * Expo push notifications — transport layer only.
 *
 * Sends to Expo's HTTP push gateway. The caller is responsible for resolving
 * the recipient token (typically by querying `users.expo_push_token` from
 * the calling app, where the drizzle ORM is in scope). This file stays
 * dependency-light so the `web` app can also pull in this package without
 * dragging drizzle into its build.
 *
 * Always non-throwing: a push delivery failure should never break the
 * server-side flow that triggered it.
 */

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const EXPO_TOKEN_RE = /^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$/

export type PushPayload = {
  title: string
  body: string
  data?: Record<string, unknown>
  sound?: 'default' | null
  badge?: number
  channelId?: string
}

/**
 * Send a push to a single device. Returns `{ ok }` reflecting whether the
 * Expo gateway accepted the message — does NOT throw on transport errors.
 */
export async function sendPushNotification(
  expoPushToken: string,
  payload: PushPayload,
): Promise<{ ok: boolean; status?: number; error?: string }> {
  if (!expoPushToken || !EXPO_TOKEN_RE.test(expoPushToken)) {
    return { ok: false, error: 'invalid token format' }
  }
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: expoPushToken,
        title: payload.title,
        body: payload.body,
        sound: payload.sound === null ? null : 'default',
        data: payload.data ?? {},
        badge: payload.badge,
        channelId: payload.channelId ?? 'default',
        priority: 'high',
      }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, status: res.status, error: text.slice(0, 240) }
    }
    return { ok: true, status: res.status }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * Convenience helper for callers that already have a list of tokens.
 * Delivers in sequence, returning per-call results.
 */
export async function sendPushBatch(
  tokens: string[],
  payload: PushPayload,
): Promise<{ sent: number; skipped: number; failed: number }> {
  let sent = 0
  let skipped = 0
  let failed = 0
  for (const token of tokens) {
    if (!token) {
      skipped += 1
      continue
    }
    const result = await sendPushNotification(token, payload)
    if (result.ok) sent += 1
    else failed += 1
  }
  return { sent, skipped, failed }
}
