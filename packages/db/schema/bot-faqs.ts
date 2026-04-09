import { pgTable, uuid, text, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

/**
 * Bot FAQs — quick-answer shortcuts for the AI concierge.
 * Higher priority entries are matched first. Inactive rows are ignored.
 */
export const botFaqs = pgTable('bot_faqs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  priority: integer('priority').notNull().default(0),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  tenantActivePriorityIdx: index('idx_bot_faqs_tenant_active_priority').on(t.tenantId, t.active, t.priority),
}))

export type BotFaq = typeof botFaqs.$inferSelect
export type NewBotFaq = typeof botFaqs.$inferInsert
