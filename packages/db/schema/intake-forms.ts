import { pgTable, uuid, varchar, jsonb, boolean, timestamp } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { patients } from './patients'
import { appointments } from './appointments'

export const intakeForms = pgTable('intake_forms', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  fields: jsonb('fields').$type<IntakeField[]>().notNull().default([]),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const intakeResponses = pgTable('intake_responses', {
  id: uuid('id').primaryKey().defaultRandom(),
  formId: uuid('form_id').notNull().references(() => intakeForms.id),
  patientId: uuid('patient_id').notNull().references(() => patients.id),
  appointmentId: uuid('appointment_id').references(() => appointments.id),
  responses: jsonb('responses').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export type IntakeField = {
  name: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'date' | 'phone' | 'email'
  required: boolean
  options?: string[]
}

export type IntakeForm = typeof intakeForms.$inferSelect
export type IntakeResponse = typeof intakeResponses.$inferSelect
