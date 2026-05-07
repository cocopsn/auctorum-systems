import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  jsonb,
  timestamp,
  date,
  index,
} from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { patients } from './patients'
import { users } from './users'

export const DOCUMENT_TYPES = [
  'lab_result',
  'radiology',
  'prescription',
  'referral',
  'insurance',
  'other',
] as const
export const DOCUMENT_STATUSES = [
  'pending_assignment',
  'assigned',
  'archived',
] as const

export type DocumentType = (typeof DOCUMENT_TYPES)[number]
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number]

export const documents = pgTable(
  'documents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id').references(() => patients.id, { onDelete: 'set null' }),
    fileName: varchar('file_name', { length: 255 }).notNull(),
    fileType: varchar('file_type', { length: 100 }),
    fileSize: integer('file_size'),
    storagePath: text('storage_path').notNull(),
    storageBucket: varchar('storage_bucket', { length: 50 }).notNull().default('documents'),
    documentType: varchar('document_type', { length: 30 }),
    extractedText: text('extracted_text'),
    aiSummary: text('ai_summary'),
    aiMetadata: jsonb('ai_metadata').default({}),
    documentDate: date('document_date'),
    uploadedBy: uuid('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
    status: varchar('status', { length: 30 }).notNull().default('pending_assignment'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    tenantStatusIdx: index('idx_documents_tenant_status').on(t.tenantId, t.status),
    tenantPatientIdx: index('idx_documents_tenant_patient').on(t.tenantId, t.patientId),
    tenantCreatedIdx: index('idx_documents_tenant_created').on(t.tenantId, t.createdAt),
    tenantTypeIdx: index('idx_documents_tenant_type').on(t.tenantId, t.documentType),
  }),
)

export type Document = typeof documents.$inferSelect
export type NewDocument = typeof documents.$inferInsert
