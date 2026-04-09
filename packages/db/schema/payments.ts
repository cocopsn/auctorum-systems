import { pgTable, uuid, varchar, text, decimal, timestamp, index } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { clients } from './clients'
import { quotes } from './quotes'
import { appointments } from './appointments'

/**
 * Payments — money received by the tenant. Can be linked to either a quote (B2B)
 * or an appointment (Med). Phase 1: manual registration only.
 */
export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('MXN'),
  method: varchar('method', { length: 30 }).notNull(), // cash|transfer|mercadopago|stripe|other
  processor: varchar('processor', { length: 30 }).notNull().default('manual'), // manual|mercadopago|stripe
  status: varchar('status', { length: 20 }).notNull().default('completed'), // pending|completed|failed|refunded
  reference: varchar('reference', { length: 255 }), // external txn id, transfer ref, etc
  linkedQuoteId: uuid('linked_quote_id').references(() => quotes.id, { onDelete: 'set null' }),
  linkedAppointmentId: uuid('linked_appointment_id').references(() => appointments.id, { onDelete: 'set null' }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
  tenantStatusIdx: index('idx_payments_tenant_status').on(t.tenantId, t.status),
  tenantCreatedIdx: index('idx_payments_tenant_created').on(t.tenantId, t.createdAt),
}))

export type Payment = typeof payments.$inferSelect
export type NewPayment = typeof payments.$inferInsert
