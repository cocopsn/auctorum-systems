import { pgTable, uuid, varchar, boolean, integer, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { clients } from './clients'
import { users } from './users'
import { doctors } from './doctors'

/**
 * Conversations — top-level threads between a tenant and a client across any channel.
 * One conversation has many messages. botPaused lets a human take over the bot.
 *
 * `externalId` identifies the upstream party where there's no phone — e.g.
 * Instagram's PSID (Page-Scoped User ID) for DMs. For WhatsApp it's NULL
 * (the client's phone serves the same role via clients.phone).
 */
export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
  channel: varchar('channel', { length: 30 }).notNull().default('whatsapp'), // whatsapp|web|telegram|facebook|instagram|sms|phone
  externalId: varchar('external_id', { length: 255 }),
  status: varchar('status', { length: 20 }).notNull().default('open'), // open|closed|archived
  assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  doctorId: uuid('doctor_id').references(() => doctors.id, { onDelete: 'set null' }),
  botPaused: boolean('bot_paused').notNull().default(false),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
  unreadCount: integer('unread_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  tenantStatusIdx: index('idx_conv_tenant_status').on(t.tenantId, t.status),
  tenantLastIdx: index('idx_conv_tenant_last').on(t.tenantId, t.lastMessageAt),
  // Idempotent upsert key for webhooks: (tenant, channel, externalId)
  tenantChannelExtIdx: uniqueIndex('idx_conv_tenant_channel_extid').on(t.tenantId, t.channel, t.externalId),
}))

export type Conversation = typeof conversations.$inferSelect
export type NewConversation = typeof conversations.$inferInsert
