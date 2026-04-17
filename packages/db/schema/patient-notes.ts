import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { patients } from './patients'

export const patientNotes = pgTable('patient_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id'),
  title: varchar('title', { length: 255 }),
  content: text('content').notNull(),
  noteType: varchar('note_type', { length: 32 }).notNull().default('general'),
  isPinned: boolean('is_pinned').notNull().default(false),
  attachments: jsonb('attachments').default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  patientIdx: index('idx_patient_notes_patient').on(table.patientId),
  tenantIdx: index('idx_patient_notes_tenant').on(table.tenantId),
}))

export type PatientNote = typeof patientNotes.$inferSelect
export type NewPatientNote = typeof patientNotes.$inferInsert
