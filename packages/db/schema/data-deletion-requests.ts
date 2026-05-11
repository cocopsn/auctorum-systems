import { pgTable, uuid, varchar, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { patients } from './patients'

/**
 * Data deletion requests — Meta Platform Data Deletion Callback +
 * LFPDPPP ARCO "cancelación" requests + admin-initiated purges.
 *
 * Lifecycle: pending → processing → completed | failed | cancelled.
 * The cron `scripts/cron-data-deletion.ts` runs daily, picks rows whose
 * `scheduled_for <= now()` and walks the purge chain (messages →
 * conversations → patient files → patient row). Audit trail of WHAT got
 * deleted lives in `data_types_deleted` (jsonb append-only array).
 */
export const dataDeletionRequests = pgTable(
  'data_deletion_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    source: varchar('source', { length: 20 }).notNull(),
    externalUserId: varchar('external_user_id', { length: 100 }),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'set null' }),
    patientId: uuid('patient_id').references(() => patients.id, { onDelete: 'set null' }),
    contactEmail: varchar('contact_email', { length: 255 }),
    contactPhone: varchar('contact_phone', { length: 50 }),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    dataTypesDeleted: jsonb('data_types_deleted').notNull().default([]),
    requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }).notNull(),
    processingStartedAt: timestamp('processing_started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    error: text('error'),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    statusScheduledIdx: index('idx_ddr_status_scheduled').on(t.status, t.scheduledFor),
    externalUserIdx: index('idx_ddr_external_user').on(t.externalUserId),
  }),
)

export type DataDeletionRequest = typeof dataDeletionRequests.$inferSelect
export type NewDataDeletionRequest = typeof dataDeletionRequests.$inferInsert
