import { pgTable, uuid, varchar, text, decimal, timestamp, index } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { clients } from './clients'
import { payments } from './payments'

/**
 * Invoices — Mexican CFDI invoice requests. Phase 1: capture fiscal data only.
 * Phase 2: integrate with Facturapi or similar to actually stamp/timbrar.
 */
export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
  paymentId: uuid('payment_id').references(() => payments.id, { onDelete: 'set null' }),
  folio: varchar('folio', { length: 50 }), // Internal folio number, set after stamping
  rfc: varchar('rfc', { length: 13 }).notNull(),
  razonSocial: varchar('razon_social', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  usoCfdi: varchar('uso_cfdi', { length: 10 }), // SAT code: G01, G03, P01, etc
  regimenFiscal: varchar('regimen_fiscal', { length: 10 }), // SAT code: 601, 612, etc
  cpZip: varchar('cp_zip', { length: 5 }), // Domicilio fiscal CP
  total: decimal('total', { precision: 12, scale: 2 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending|stamped|cancelled|failed
  cfdiXmlUrl: text('cfdi_xml_url'),
  pdfUrl: text('pdf_url'),
  errorMessage: text('error_message'),
  stampedAt: timestamp('stamped_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  tenantStatusIdx: index('idx_invoices_tenant_status').on(t.tenantId, t.status),
}))

export type Invoice = typeof invoices.$inferSelect
export type NewInvoice = typeof invoices.$inferInsert
