import { pgTable, uuid, varchar, text, date, decimal, integer, timestamp, boolean, jsonb, unique } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

export const patients = pgTable('patients', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }).notNull(),
  dateOfBirth: date('date_of_birth'),
  gender: varchar('gender', { length: 20 }),
  bloodType: varchar('blood_type', { length: 5 }),
  allergies: text('allergies'),
  chronicConditions: text('chronic_conditions'),
  medications: text('medications'),
  emergencyContactName: varchar('emergency_contact_name', { length: 255 }),
  emergencyContactPhone: varchar('emergency_contact_phone', { length: 50 }),
  emergencyContactRelationship: varchar('emergency_contact_relationship', { length: 50 }),
  insuranceProvider: varchar('insurance_provider', { length: 255 }),
  insurancePolicy: varchar('insurance_policy', { length: 100 }),
  insurancePolicyNumber: varchar('insurance_policy_number', { length: 100 }),
  // ─── NOM-004-SSA3-2012 demographics ───
  curp: varchar('curp', { length: 18 }),
  occupation: varchar('occupation', { length: 255 }),
  maritalStatus: varchar('marital_status', { length: 20 }),
  address: text('address'),
  consentSigned: boolean('consent_signed').default(false),
  consentSignedAt: timestamp('consent_signed_at', { withTimezone: true }),
  // ─── NOM-004 Historia Clínica (10 secciones en un JSONB) ───
  // Ver packages/db/migrations/0045_clinical_history.sql para el shape.
  clinicalHistory: jsonb('clinical_history').default({}),
  notes: text('notes'),
  avatarUrl: text('avatar_url'),
  portalToken: varchar('portal_token', { length: 36 }).notNull().$defaultFn(() => crypto.randomUUID()),
  totalAppointments: integer('total_appointments').default(0),
  totalNoShows: integer('total_no_shows').default(0),
  totalSpent: decimal('total_spent', { precision: 12, scale: 2 }).default('0'),
  lastAppointmentAt: timestamp('last_appointment_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniqueTenantPhone: unique('uq_patients_tenant_phone').on(table.tenantId, table.phone),
}))

export type Patient = typeof patients.$inferSelect
export type NewPatient = typeof patients.$inferInsert
