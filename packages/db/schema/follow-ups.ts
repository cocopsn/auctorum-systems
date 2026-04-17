import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { clients } from './clients'
import { appointments } from './appointments'
import { quotes } from './quotes'

/**
 * Follow-ups — scheduled reminder/recall messages tied to a client.
 * Optionally linked to the appointment or quote that triggered the follow-up.
 * Phase 1: store-only. The send pipeline (Resend / WhatsApp) lives in Checkpoint 5.
 */
export const followUps = pgTable('follow_ups', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  appointmentId: uuid('appointment_id').references(() => appointments.id, { onDelete: 'set null' }),
  quoteId: uuid('quote_id').references(() => quotes.id, { onDelete: 'set null' }),
  type: varchar('type', { length: 30 }).notNull(), // post_appointment|recall|quote_followup|custom
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  status: varchar('status', { length: 20 }).notNull().default('scheduled'), // scheduled|sent|responded|cancelled
  messageTemplate: text('message_template'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
  tenantStatusSchedIdx: index('idx_follow_ups_tenant_status_sched').on(t.tenantId, t.status, t.scheduledAt),
}))

export type FollowUp = typeof followUps.$inferSelect
export type NewFollowUp = typeof followUps.$inferInsert