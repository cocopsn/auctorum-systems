import { pgTable, uuid, varchar, text, boolean, timestamp, index } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { users } from './users'
import { patients } from './patients'
import { appointments } from './appointments'

export const clinicalNotes = pgTable('clinical_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  appointmentId: uuid('appointment_id').references(() => appointments.id),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  patientId: uuid('patient_id').notNull().references(() => patients.id),
  noteType: varchar('note_type', { length: 30 }).default('consultation'),
  subjective: text('subjective'),
  objective: text('objective'),
  assessment: text('assessment'),
  plan: text('plan'),
  content: text('content'),
  aiGenerated: boolean('ai_generated').default(false),
  aiTranscript: text('ai_transcript'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  patientIdx: index('idx_notes_patient').on(table.patientId),
}))

export type ClinicalNote = typeof clinicalNotes.$inferSelect
export type NewClinicalNote = typeof clinicalNotes.$inferInsert
