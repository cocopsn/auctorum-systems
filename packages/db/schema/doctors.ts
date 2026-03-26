import { pgTable, uuid, varchar, text, boolean, jsonb, decimal, integer, timestamp } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

export const doctors = pgTable('doctors', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  specialty: varchar('specialty', { length: 255 }).notNull(),
  subSpecialty: varchar('sub_specialty', { length: 255 }),
  cedulaProfesional: varchar('cedula_profesional', { length: 20 }),
  cedulaEspecialidad: varchar('cedula_especialidad', { length: 20 }),
  consultationFee: decimal('consultation_fee', { precision: 10, scale: 2 }),
  consultationDurationMin: integer('consultation_duration_min').default(30),
  bio: text('bio'),
  education: text('education'),
  hospitalAffiliations: text('hospital_affiliations'),
  languages: varchar('languages', { length: 255 }).default('Español'),
  acceptsInsurance: boolean('accepts_insurance').default(false),
  insuranceProviders: jsonb('insurance_providers').$type<string[]>().default([]),
  photoUrl: text('photo_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export type Doctor = typeof doctors.$inferSelect
export type NewDoctor = typeof doctors.$inferInsert
