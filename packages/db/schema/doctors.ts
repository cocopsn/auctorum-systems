import { pgTable, uuid, varchar, text, boolean, jsonb, integer, timestamp, index } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

export const doctors = pgTable('doctors', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  specialty: varchar('specialty', { length: 255 }),
  subSpecialty: varchar('sub_specialty', { length: 255 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  cedulaProfesional: varchar('cedula_profesional', { length: 20 }),
  cedulaEspecialidad: varchar('cedula_especialidad', { length: 20 }),
  // ─── NOM-004-SSA3-2012 doctor credentials ───
  university: varchar('university', { length: 255 }),
  ssaRegistration: varchar('ssa_registration', { length: 50 }),
  digitalSignature: text('digital_signature'),  // base64 PNG of doctor's signature
  consultationFee: varchar('consultation_fee', { length: 20 }),
  consultationDurationMin: integer('consultation_duration_min').default(30),
  bio: text('bio'),
  education: text('education'),
  hospitalAffiliations: text('hospital_affiliations'),
  languages: varchar('languages', { length: 255 }).default('Español'),
  acceptsInsurance: boolean('accepts_insurance').default(false),
  insuranceProviders: jsonb('insurance_providers').$type<string[]>().default([]),
  photoUrl: text('photo_url'),
  // Multi-doctor scheduling fields
  googleCalendarId: varchar('google_calendar_id', { length: 255 }),
  googleAccessToken: text('google_access_token'),
  googleRefreshToken: text('google_refresh_token'),
  googleTokenExpiry: timestamp('google_token_expiry', { withTimezone: true }),
  schedule: jsonb('schedule').$type<Record<string, { start: string; end: string; enabled: boolean }>>(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  tenantIdx: index('idx_doctors_tenant').on(table.tenantId),
  tenantActiveIdx: index('idx_doctors_tenant_active').on(table.tenantId, table.isActive),
}))

export type Doctor = typeof doctors.$inferSelect
export type NewDoctor = typeof doctors.$inferInsert
