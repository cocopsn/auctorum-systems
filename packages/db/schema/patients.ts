import { pgTable, uuid, varchar, text, date, decimal, integer, timestamp, unique } from 'drizzle-orm/pg-core'
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
  emergencyContactName: varchar('emergency_contact_name', { length: 255 }),
  emergencyContactPhone: varchar('emergency_contact_phone', { length: 50 }),
  insuranceProvider: varchar('insurance_provider', { length: 255 }),
  insurancePolicy: varchar('insurance_policy', { length: 100 }),
  notes: text('notes'),
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
