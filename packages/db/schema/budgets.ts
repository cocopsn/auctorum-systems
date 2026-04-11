import { pgTable, uuid, varchar, text, decimal, date, jsonb, timestamp, index } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { clients } from './clients'
import { patients } from './patients'

export const budgets = pgTable('budgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
  patientId: uuid('patient_id').references(() => patients.id, { onDelete: 'set null' }),
  folio: varchar('folio', { length: 20 }),
  items: jsonb('items').default([]),
  subtotal: decimal('subtotal', { precision: 12, scale: 2 }).default('0'),
  tax: decimal('tax', { precision: 12, scale: 2 }).default('0'),
  total: decimal('total', { precision: 12, scale: 2 }).default('0'),
  status: varchar('status', { length: 20 }).default('pending'),
  notes: text('notes'),
  validUntil: date('valid_until'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
  tenantIdx: index('idx_budgets_tenant').on(t.tenantId),
  statusIdx: index('idx_budgets_status').on(t.tenantId, t.status),
}))

export type Budget = typeof budgets.$inferSelect
export type NewBudget = typeof budgets.$inferInsert
