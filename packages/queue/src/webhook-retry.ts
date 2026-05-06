/**
 * Webhook retry queue.
 *
 * When a webhook delivery (Stripe / MercadoPago / Meta) fails mid-processing,
 * `recordWebhookFailure` writes a row to `webhook_failures`. The retry cron
 * (`scripts/cron-webhook-retries.ts`, run every minute) calls
 * `processPendingWebhooks` to retry due rows with exponential backoff.
 *
 * Dedup is by (source, external_id). Re-queueing the same external_id
 * bumps `attempts` instead of inserting a duplicate (handled at the call
 * site via ON CONFLICT or upsert if you need that behavior).
 */

import { and, eq, isNull, lte, sql } from 'drizzle-orm'
import { db, webhookFailures, type WebhookFailure } from '@quote-engine/db'

export const WEBHOOK_RETRY_BACKOFF_MS = 30_000     // 30s base
export const WEBHOOK_RETRY_MAX_ATTEMPTS = 5

export type WebhookSource = 'stripe' | 'mercadopago' | 'meta'

/**
 * Record a transient webhook failure for later retry. Returns the row id
 * (existing or newly created when there is no external_id for dedup).
 */
export async function recordWebhookFailure(opts: {
  source: WebhookSource
  externalId?: string | null
  payload: unknown
  error: string
}): Promise<string> {
  const nextRetryAt = nextRetryDate(1)

  const [row] = await db
    .insert(webhookFailures)
    .values({
      source: opts.source,
      externalId: opts.externalId ?? null,
      payload: (opts.payload ?? {}) as Record<string, unknown>,
      error: opts.error,
      attempts: 1,
      nextRetryAt,
    })
    .onConflictDoUpdate({
      target: [webhookFailures.source, webhookFailures.externalId],
      set: {
        attempts: sql`${webhookFailures.attempts} + 1`,
        nextRetryAt: sql`NOW() + ((30 * power(2, ${webhookFailures.attempts})) || ' seconds')::interval`,
        error: opts.error,
      },
      // Only collide on rows that haven't resolved yet.
      setWhere: isNull(webhookFailures.resolvedAt),
    })
    .returning({ id: webhookFailures.id })

  return row.id
}

/**
 * Pick up due, unresolved webhook failures and try them. The handler is
 * provided by the caller (typed per source) so the retry helper doesn't
 * have to import payment SDKs.
 */
export async function processPendingWebhooks(
  handlers: Partial<Record<WebhookSource, (payload: unknown) => Promise<void>>>,
  limit = 25,
): Promise<{ retried: number; resolved: number; failed: number; deadLetter: number }> {
  const now = new Date()
  const due = await db
    .select()
    .from(webhookFailures)
    .where(
      and(
        isNull(webhookFailures.resolvedAt),
        isNull(webhookFailures.deadLetterAt),
        lte(webhookFailures.nextRetryAt, now),
      ),
    )
    .limit(limit)

  let resolved = 0
  let failed = 0
  let deadLetter = 0

  for (const row of due) {
    const handler = handlers[row.source as WebhookSource]
    if (!handler) {
      // No handler registered for this source — skip silently
      continue
    }

    try {
      await handler(row.payload)
      await db
        .update(webhookFailures)
        .set({ resolvedAt: new Date() })
        .where(eq(webhookFailures.id, row.id))
      resolved += 1
      console.log(
        `[WebhookRetry] ${row.source}:${row.externalId ?? row.id} resolved on attempt ${row.attempts}`,
      )
    } catch (err) {
      const nextAttempts = row.attempts + 1
      if (nextAttempts > WEBHOOK_RETRY_MAX_ATTEMPTS) {
        await db
          .update(webhookFailures)
          .set({
            attempts: nextAttempts,
            deadLetterAt: new Date(),
            error: errMessage(err),
          })
          .where(eq(webhookFailures.id, row.id))
        deadLetter += 1
        console.error(
          `[WebhookRetry] ${row.source}:${row.externalId ?? row.id} DEAD LETTER after ${WEBHOOK_RETRY_MAX_ATTEMPTS} attempts`,
        )
      } else {
        await db
          .update(webhookFailures)
          .set({
            attempts: nextAttempts,
            nextRetryAt: nextRetryDate(nextAttempts),
            error: errMessage(err),
          })
          .where(eq(webhookFailures.id, row.id))
        failed += 1
        console.warn(
          `[WebhookRetry] ${row.source}:${row.externalId ?? row.id} retry ${nextAttempts} failed: ${errMessage(err)}`,
        )
      }
    }
  }

  return { retried: due.length, resolved, failed, deadLetter }
}

function nextRetryDate(attempts: number): Date {
  // 30s * 2^(attempts-1): 30s, 60s, 2m, 4m, 8m
  const ms = WEBHOOK_RETRY_BACKOFF_MS * 2 ** Math.max(0, attempts - 1)
  return new Date(Date.now() + ms)
}

function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return typeof err === 'string' ? err : JSON.stringify(err)
}

export type { WebhookFailure }
