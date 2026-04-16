import { pgTable, uuid, varchar, text, jsonb, timestamp, integer, index } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { users } from './users'

/**
 * Campaigns — bulk WhatsApp messaging blasts to a filtered audience.
 * audienceFilter is a free-form jsonb describing how to query clients.
 * statsJson aggregates send/deliver/read counts (updated by the worker).
 */
export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  templateId: varchar('template_id', { length: 255 }), // Meta-approved WA template id
  audienceFilter: jsonb('audience_filter').notNull().default({}),
  status: varchar('status', { length: 20 }).notNull().default('draft'), // draft|scheduled|sending|completed|failed
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  statsJson: jsonb('stats_json').notNull().default({}), // { queued, sent, delivered, read, failed }
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  // Tier 3 columns
  messageBody: text('message_body'),
  totalRecipients: integer('total_recipients').default(0),
  messagesSent: integer('messages_sent').default(0),
  messagesFailed: integer('messages_failed').default(0),
}, (t) => ({
  tenantStatusIdx: index('idx_campaigns_tenant_status').on(t.tenantId, t.status),
}))

export type Campaign = typeof campaigns.$inferSelect
export type NewCampaign = typeof campaigns.$inferInsert
