import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core'

/**
 * Webhook deliveries (Stripe / MercadoPago / Meta) that failed mid-processing.
 * A retry cron picks them up with exponential backoff. After MAX_ATTEMPTS
 * the row is marked as dead-letter for manual investigation.
 *
 * Intentionally global (no tenantId) because webhooks arrive without an
 * authenticated tenant context — the handler resolves the tenant from the
 * payload itself.
 */
export const webhookFailures = pgTable(
  'webhook_failures',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    source: varchar('source', { length: 20 }).notNull(), // stripe | mercadopago | meta
    externalId: varchar('external_id', { length: 255 }), // upstream event/payment id, for dedup
    payload: jsonb('payload').notNull(),
    error: text('error'),
    attempts: integer('attempts').notNull().default(1),
    nextRetryAt: timestamp('next_retry_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    deadLetterAt: timestamp('dead_letter_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pendingIdx: index('idx_webhook_failures_pending').on(t.resolvedAt, t.deadLetterAt, t.nextRetryAt),
    dedupIdx: uniqueIndex('idx_webhook_failures_dedup').on(t.source, t.externalId),
  }),
)

export type WebhookFailure = typeof webhookFailures.$inferSelect
export type NewWebhookFailure = typeof webhookFailures.$inferInsert
