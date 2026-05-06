/**
 * Push helpers for the doctor's devices. Sends to BOTH transports in parallel:
 *  - Expo (the React Native app installed on iOS/Android phones)
 *  - Web Push / VAPID (the PWA installed on browsers, including iOS Safari
 *    on iOS 16.4+)
 *
 * Both transports are best-effort and never throw — push failures should
 * not break the server-side flow that triggered them.
 */

import { and, eq, isNotNull } from 'drizzle-orm'
import { db, users, webPushSubscriptions } from '@quote-engine/db'
import {
  sendPushBatch,
  sendWebPushBatch,
  isWebPushConfigured,
  type PushPayload,
  type WebPushPayload,
} from '@quote-engine/notifications'

export type DoctorPushPayload = PushPayload & {
  url?: string // deep-link path opened by the SW notificationclick handler
}

type DoctorNotifyResult = {
  expo: { sent: number; skipped: number; failed: number }
  web: { sent: number; failed: number; pruned: number }
}

export async function notifyDoctorDevices(
  tenantId: string,
  payload: DoctorPushPayload,
): Promise<DoctorNotifyResult> {
  const result: DoctorNotifyResult = {
    expo: { sent: 0, skipped: 0, failed: 0 },
    web: { sent: 0, failed: 0, pruned: 0 },
  }

  await Promise.allSettled([
    (async () => {
      try {
        const recipients = await db
          .select({ token: users.expoPushToken })
          .from(users)
          .where(and(eq(users.tenantId, tenantId), isNotNull(users.expoPushToken)))
        const tokens = recipients.map((r) => r.token).filter((t): t is string => !!t)
        if (tokens.length === 0) return
        result.expo = await sendPushBatch(tokens, payload)
      } catch (err) {
        console.warn('[notify-doctor] expo error', err instanceof Error ? err.message : err)
      }
    })(),

    (async () => {
      if (!isWebPushConfigured()) return
      try {
        const subs = await db
          .select({
            endpoint: webPushSubscriptions.endpoint,
            p256dh: webPushSubscriptions.p256dh,
            authKey: webPushSubscriptions.authKey,
          })
          .from(webPushSubscriptions)
          .where(eq(webPushSubscriptions.tenantId, tenantId))
        if (subs.length === 0) return

        const webPayload: WebPushPayload = {
          title: payload.title,
          body: payload.body,
          url: payload.url || '/dashboard',
          tag: typeof payload.data?.['tag'] === 'string' ? (payload.data['tag'] as string) : undefined,
          data: payload.data,
          renotify: false,
        }

        const batch = await sendWebPushBatch(subs, webPayload)
        result.web.sent = batch.sent
        result.web.failed = batch.failed

        // Prune dead subscriptions (404/410)
        if (batch.expired.length > 0) {
          for (const dead of batch.expired) {
            try {
              await db
                .delete(webPushSubscriptions)
                .where(eq(webPushSubscriptions.endpoint, dead.endpoint))
              result.web.pruned += 1
            } catch (err) {
              console.warn(
                '[notify-doctor] prune failed for',
                dead.endpoint,
                err instanceof Error ? err.message : err,
              )
            }
          }
        }
      } catch (err) {
        console.warn('[notify-doctor] web-push error', err instanceof Error ? err.message : err)
      }
    })(),
  ])

  return result
}
