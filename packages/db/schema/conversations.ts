import { pgTable, uuid, varchar, boolean, integer, timestamp, index } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { clients } from './clients'
import { users } from './users'

/**
 * Conversations — top-level threads between a tenant and a client across any channel.
 * One conversation has many messages. botPaused lets a human take over the bot.
 */
export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
  channel: varchar('channel', { length: 30 }).notNull().default('whatsapp'), // whatsapp|web|telegram|facebook|instagram|sms|phone
  status: varchar('status', { length: 20 }).notNull().default('open'), // open|closed|archived
  assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  botPaused: boolean('bot_paused').notNull().default(false),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
  unreadCount: integer('unread_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  tenantStatusIdx: index('idx_conv_tenant_status').on(t.tenantId, t.status),
  tenantLastIdx: index('idx_conv_tenant_last').on(t.tenantId, t.lastMessageAt),
}))

export type Conversation = typeof conversations.$inferSelect
export type NewConversation = typeof conversations.$inferInsert
