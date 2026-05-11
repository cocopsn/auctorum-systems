import { pgTable, uuid, varchar, integer, decimal, timestamp, text, unique } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  company: varchar('company', { length: 255 }),
  totalQuotes: integer('total_quotes').default(0),
  totalQuotedAmount: decimal('total_quoted_amount', { precision: 14, scale: 2 }).default('0'),
  totalAccepted: integer('total_accepted').default(0),
  totalAcceptedAmount: decimal('total_accepted_amount', { precision: 14, scale: 2 }).default('0'),
  lastQuoteAt: timestamp('last_quote_at', { withTimezone: true }),
  // WhatsApp opt-in tracking — see packages/db/migrations/0057.
  whatsappOptedInAt: timestamp('whatsapp_opted_in_at', { withTimezone: true }),
  whatsappOptedOutAt: timestamp('whatsapp_opted_out_at', { withTimezone: true }),
  // Mini-CRM (CP11)
  notes: text('notes'),
  status: varchar('status', { length: 20 }).notNull().default('lead'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  tenantPhone: unique('uq_clients_tenant_phone').on(table.tenantId, table.phone),
}));

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
