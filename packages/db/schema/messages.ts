import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core'
import { conversations } from './conversations'

/**
 * Messages — individual chat messages inside a conversation.
 * direction = inbound (from client) | outbound (from us).
 * senderType distinguishes bot vs manual operator vs system messages.
 */
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  direction: varchar('direction', { length: 10 }).notNull(), // inbound|outbound
  senderType: varchar('sender_type', { length: 20 }).notNull(), // bot|manual|client|system
  content: text('content').notNull(),
  mediaUrl: text('media_url'),
  mediaType: varchar('media_type', { length: 50 }),
  externalId: varchar('external_id', { length: 255 }), // wamid for whatsapp, etc
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  convIdx: index('idx_msg_conv_created').on(t.conversationId, t.createdAt),
}))

export type Message = typeof messages.$inferSelect
export type NewMessage = typeof messages.$inferInsert
