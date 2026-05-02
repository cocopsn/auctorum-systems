import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { patients } from './patients'
import { doctors } from './doctors'

/**
 * Informed consent records (NOM-004-SSA3-2012).
 *
 * For procedures requiring patient consent, the doctor creates a row that
 * captures the procedure description, risks, alternatives, and signatures
 * from both parties. Once `signed_at` is set the consent is immutable;
 * the patient can revoke it later by setting `revoked_at`.
 */
export const informedConsents = pgTable('informed_consents', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),
  doctorId: uuid('doctor_id').references(() => doctors.id, { onDelete: 'set null' }),
  procedureName: varchar('procedure_name', { length: 255 }).notNull(),
  description: text('description').notNull(),
  risks: text('risks').notNull(),
  alternatives: text('alternatives'),
  patientSignature: text('patient_signature'),  // base64 PNG (touch/mouse)
  doctorSignature: text('doctor_signature'),    // base64 PNG
  signedAt: timestamp('signed_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  patientIdx: index('idx_consents_patient').on(t.patientId),
  tenantIdx: index('idx_consents_tenant').on(t.tenantId),
}))

export type InformedConsent = typeof informedConsents.$inferSelect
export type NewInformedConsent = typeof informedConsents.$inferInsert
