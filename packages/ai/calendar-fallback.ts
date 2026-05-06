/**
 * Google Calendar fallback.
 *
 * If a calendar operation fails (network blip, Google 5xx, expired token,
 * etc.), the operation is enqueued in `pending_calendar_ops` and retried
 * by the cron `scripts/cron-calendar-sync.ts`. The local appointment
 * record is created/updated/deleted regardless — Google Calendar is a
 * mirror, not the source of truth.
 */

import { and, asc, eq, isNull, lte, sql } from 'drizzle-orm'
import { db, pendingCalendarOps, type NewPendingCalendarOp } from '@quote-engine/db'

export type CalendarOperation = 'create' | 'update' | 'delete'

export const CALENDAR_RETRY_MAX_ATTEMPTS = 6
export const CALENDAR_RETRY_BACKOFF_MS = 60_000 // 1 min base

/**
 * Wrap a Google Calendar call. On failure, persist the operation to
 * `pending_calendar_ops` for the retry cron to pick up.
 */
export async function calendarWithFallback<T>(opts: {
  tenantId: string
  appointmentId: string
  operation: CalendarOperation
  data: Record<string, unknown>
  call: () => Promise<T>
}): Promise<{ ok: true; result: T } | { ok: false; queuedId: string; error: string }> {
  try {
    const result = await opts.call()
    return { ok: true, result }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn(
      `[CalendarFallback] ${opts.operation} for appt ${opts.appointmentId} failed → queued for retry:`,
      message,
    )
    const [row] = await db
      .insert(pendingCalendarOps)
      .values({
        tenantId: opts.tenantId,
        operation: opts.operation,
        appointmentId: opts.appointmentId,
        data: opts.data,
        attempts: 0,
        nextRetryAt: nextRetry(0),
        lastError: message,
      } satisfies NewPendingCalendarOp)
      .returning({ id: pendingCalendarOps.id })
    return { ok: false, queuedId: row.id, error: message }
  }
}

/**
 * Process pending calendar ops with exponential backoff. The handler is
 * provided by the caller so the helper doesn't have to import the Google
 * SDK.
 */
export async function processPendingCalendarOps(
  handler: (op: {
    tenantId: string
    operation: CalendarOperation
    appointmentId: string
    data: Record<string, unknown>
  }) => Promise<void>,
  limit = 20,
): Promise<{ retried: number; resolved: number; failed: number; deadLetter: number }> {
  const now = new Date()
  const due = await db
    .select()
    .from(pendingCalendarOps)
    .where(
      and(
        eq(pendingCalendarOps.processed, false),
        isNull(pendingCalendarOps.processedAt),
        lte(pendingCalendarOps.nextRetryAt, now),
      ),
    )
    .orderBy(asc(pendingCalendarOps.nextRetryAt))
    .limit(limit)

  let resolved = 0
  let failed = 0
  let deadLetter = 0

  for (const op of due) {
    try {
      await handler({
        tenantId: op.tenantId,
        operation: op.operation as CalendarOperation,
        appointmentId: op.appointmentId,
        data: op.data as Record<string, unknown>,
      })
      await db
        .update(pendingCalendarOps)
        .set({ processed: true, processedAt: new Date() })
        .where(eq(pendingCalendarOps.id, op.id))
      resolved += 1
    } catch (err) {
      const nextAttempts = op.attempts + 1
      const message = err instanceof Error ? err.message : String(err)
      if (nextAttempts > CALENDAR_RETRY_MAX_ATTEMPTS) {
        // Dead letter: mark processed=true with an error so it stops retrying
        // but doesn't keep blocking the queue. Keep lastError for triage.
        await db
          .update(pendingCalendarOps)
          .set({
            processed: true,
            processedAt: new Date(),
            attempts: nextAttempts,
            lastError: `[DEAD LETTER] ${message}`,
          })
          .where(eq(pendingCalendarOps.id, op.id))
        deadLetter += 1
        console.error(
          `[CalendarFallback] DEAD LETTER op ${op.id} (${op.operation} appt ${op.appointmentId})`,
        )
      } else {
        await db
          .update(pendingCalendarOps)
          .set({
            attempts: nextAttempts,
            nextRetryAt: nextRetry(nextAttempts),
            lastError: message,
          })
          .where(eq(pendingCalendarOps.id, op.id))
        failed += 1
      }
    }
  }

  return { retried: due.length, resolved, failed, deadLetter }
}

function nextRetry(attempts: number): Date {
  // 1m, 2m, 4m, 8m, 16m, 32m
  const ms = CALENDAR_RETRY_BACKOFF_MS * 2 ** Math.max(0, attempts)
  return new Date(Date.now() + ms)
}
