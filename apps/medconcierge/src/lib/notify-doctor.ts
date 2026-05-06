/**
 * Push helper that lives in the medconcierge app (where drizzle-orm is in
 * scope). Resolves all device tokens for a tenant's users and forwards to
 * the transport-only `sendPushBatch` in @quote-engine/notifications.
 *
 * Use this from any server-side flow that wants to ping the doctor's
 * mobile app: appointment created via WhatsApp, new inbound message,
 * payment received, etc.
 */

import { and, eq, isNotNull } from 'drizzle-orm'
import { db, users } from '@quote-engine/db'
import { sendPushBatch, type PushPayload } from '@quote-engine/notifications'

export async function notifyDoctorDevices(
  tenantId: string,
  payload: PushPayload,
): Promise<{ sent: number; skipped: number; failed: number }> {
  try {
    const recipients = await db
      .select({ token: users.expoPushToken })
      .from(users)
      .where(and(eq(users.tenantId, tenantId), isNotNull(users.expoPushToken)))
    const tokens = recipients.map((r) => r.token).filter((t): t is string => !!t)
    if (tokens.length === 0) return { sent: 0, skipped: 0, failed: 0 }
    return await sendPushBatch(tokens, payload)
  } catch (err) {
    console.warn('[notify-doctor] error', err instanceof Error ? err.message : err)
    return { sent: 0, skipped: 0, failed: 0 }
  }
}
