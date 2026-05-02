import { pgTable, uuid, varchar, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { campaigns } from './campaigns'
import { clients } from './clients'

/**
 * Campaign messages — one row per (campaign, recipient client).
 * Tracks lifecycle: queued -> sent -> delivered -> read | failed.
 *
 * Denormalized fields (tenant_id, phone, recipient_name, message_body) are
 * populated at queue time so the worker can dispatch without a join, and so
 * the historical record survives even if the client row is deleted.
 *
 * `whatsapp_message_id` is set when the Meta API accepts the send and is used
 * by the webhook handler to attribute incoming delivery/read status updates
 * back to the right row.
 */
export const campaignMessages = pgTable('campaign_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id'),
  phone: varchar('phone', { length: 50 }),
  recipientName: varchar('recipient_name', { length: 255 }),
  messageBody: text('message_body'),
  whatsappMessageId: varchar('whatsapp_message_id', { length: 128 }),
  status: varchar('status', { length: 20 }).notNull().default('queued'), // queued|sent|delivered|read|failed
  sentAt: timestamp('sent_at', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  readAt: timestamp('read_at', { withTimezone: true }),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  campaignStatusIdx: index('idx_camp_msg_campaign_status').on(t.campaignId, t.status),
  waIdIdx: uniqueIndex('idx_camp_msg_wa_id').on(t.whatsappMessageId),
  tenantIdx: index('idx_camp_msg_tenant').on(t.tenantId),
}))

export type CampaignMessage = typeof campaignMessages.$inferSelect
export type NewCampaignMessage = typeof campaignMessages.$inferInsert
