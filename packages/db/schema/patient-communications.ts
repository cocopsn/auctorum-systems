import { pgTable, uuid, varchar, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { patients } from './patients'
import { users } from './users'

export const COMM_TYPES = [
  'email_sent',
  'email_received',
  'whatsapp_sent',
  'whatsapp_received',
  'sms_sent',
  'call',
  'note',
] as const

export type CommType = (typeof COMM_TYPES)[number]

export const patientCommunications = pgTable(
  'patient_communications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 30 }).notNull(),
    subject: varchar('subject', { length: 500 }),
    content: text('content'),
    recipient: varchar('recipient', { length: 255 }),
    externalId: varchar('external_id', { length: 255 }),
    metadata: jsonb('metadata').default({}),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    patientOccurredIdx: index('idx_pcomms_patient_occurred').on(t.patientId, t.occurredAt),
    tenantIdx: index('idx_pcomms_tenant').on(t.tenantId),
    tenantTypeIdx: index('idx_pcomms_type').on(t.tenantId, t.type),
  }),
)

export type PatientCommunication = typeof patientCommunications.$inferSelect
export type NewPatientCommunication = typeof patientCommunications.$inferInsert
