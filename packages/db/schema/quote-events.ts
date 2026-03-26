import { pgTable, uuid, varchar, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { quotes } from './quotes';

export const quoteEvents = pgTable('quote_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  quoteId: uuid('quote_id').notNull().references(() => quotes.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  eventType: varchar('event_type', { length: 30 }).notNull(),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export type QuoteEvent = typeof quoteEvents.$inferSelect;
export type NewQuoteEvent = typeof quoteEvents.$inferInsert;
