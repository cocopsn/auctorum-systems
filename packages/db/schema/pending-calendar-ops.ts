import { boolean, index, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

/**
 * Calendar operations that failed (Google Calendar unreachable, transient
 * 5xx, etc.) and need to be retried by a background cron once the upstream
 * is back.
 */
export const pendingCalendarOps = pgTable(
  'pending_calendar_ops',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    operation: varchar('operation', { length: 20 }).notNull(), // create | update | delete
    appointmentId: uuid('appointment_id').notNull(),
    data: jsonb('data').notNull(),
    processed: boolean('processed').notNull().default(false),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
    nextRetryAt: timestamp('next_retry_at', { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pendingIdx: index('idx_pending_cal_ops_pending').on(t.processed, t.nextRetryAt),
    tenantIdx: index('idx_pending_cal_ops_tenant').on(t.tenantId, t.createdAt),
  }),
)

export type PendingCalendarOp = typeof pendingCalendarOps.$inferSelect
export type NewPendingCalendarOp = typeof pendingCalendarOps.$inferInsert
