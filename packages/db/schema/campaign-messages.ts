import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core'
import { campaigns } from './campaigns'
import { clients } from './clients'

/**
 * Campaign messages — one row per (campaign, recipient client).
 * Tracks lifecycle: queued -> sent -> delivered -> read | failed.
 */
export const campaignMessages = pgTable('campaign_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 20 }).notNull().default('queued'), // queued|sent|delivered|read|failed
  sentAt: timestamp('sent_at', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  readAt: timestamp('read_at', { withTimezone: true }),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  campaignStatusIdx: index('idx_camp_msg_campaign_status').on(t.campaignId, t.status),
}))

export type CampaignMessage = typeof campaignMessages.$inferSelect
export type NewCampaignMessage = typeof campaignMessages.$inferInsert
