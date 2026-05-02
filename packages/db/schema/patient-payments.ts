import { pgTable, uuid, varchar, text, integer, jsonb, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { patients } from './patients'
import { appointments } from './appointments'

/**
 * Patient payments — Stripe Connect destination charges.
 *
 * Separate from `payments` (the doctor's manual / multi-rail bookkeeping
 * table) because this table is exclusively for Stripe Connect transactions
 * and tracks Auctorum's application fee per row.
 */
export const patientPayments = pgTable('patient_payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  patientId: uuid('patient_id').references(() => patients.id, { onDelete: 'set null' }),
  appointmentId: uuid('appointment_id').references(() => appointments.id, { onDelete: 'set null' }),

  // Stripe identifiers
  stripeCheckoutSessionId: varchar('stripe_checkout_session_id', { length: 100 }),
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 100 }),
  stripeChargeId: varchar('stripe_charge_id', { length: 100 }),

  // Money in centavos MXN
  amount: integer('amount').notNull(),
  applicationFee: integer('application_fee').notNull().default(0),
  currency: varchar('currency', { length: 3 }).notNull().default('mxn'),

  // pending | processing | succeeded | failed | refunded | cancelled
  status: varchar('status', { length: 20 }).notNull().default('pending'),

  description: text('description'),
  patientName: varchar('patient_name', { length: 255 }),
  patientEmail: varchar('patient_email', { length: 255 }),
  paymentMethod: varchar('payment_method', { length: 50 }),
  receiptUrl: text('receipt_url'),
  failureReason: text('failure_reason'),
  metadata: jsonb('metadata').default({}),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  tenantStatusIdx: index('idx_patient_payments_tenant').on(t.tenantId, t.status),
  sessionIdx: uniqueIndex('idx_patient_payments_session').on(t.stripeCheckoutSessionId),
  intentIdx: uniqueIndex('idx_patient_payments_intent').on(t.stripePaymentIntentId),
  appointmentIdx: index('idx_patient_payments_appointment').on(t.appointmentId),
}))

export type PatientPayment = typeof patientPayments.$inferSelect
export type NewPatientPayment = typeof patientPayments.$inferInsert
