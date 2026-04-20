import { pgTable, uuid, varchar, text, date, time, decimal, boolean, timestamp, index } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { patients } from './patients'
import { doctors } from './doctors'

export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  patientId: uuid('patient_id').notNull().references(() => patients.id),
  doctorId: uuid('doctor_id').references(() => doctors.id),
  date: date('date').notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  status: varchar('status', { length: 20 }).default('scheduled'),
  reason: varchar('reason', { length: 500 }),
  notes: text('notes'),
  diagnosis: text('diagnosis'),
  prescription: text('prescription'),
  consultationFee: decimal('consultation_fee', { precision: 10, scale: 2 }),
  paymentStatus: varchar('payment_status', { length: 20 }).default('pending'),
  paymentMethod: varchar('payment_method', { length: 30 }),
  googleEventId: varchar('google_event_id', { length: 255 }),
  reminder24hSent: boolean('reminder_24h_sent').default(false),
  reminder24hSentAt: timestamp('reminder_24h_sent_at', { withTimezone: true }),
  reminder2hSent: boolean('reminder_2h_sent').default(false),
  reminder2hSentAt: timestamp('reminder_2h_sent_at', { withTimezone: true }),
  confirmedByPatient: boolean('confirmed_by_patient').default(false),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  noShowMarkedAt: timestamp('no_show_marked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  tenantDateIdx: index('idx_appointments_tenant_date').on(table.tenantId, table.date),
  patientIdx: index('idx_appointments_patient').on(table.patientId),
  tenantStatusIdx: index('idx_appointments_status').on(table.tenantId, table.status),
  doctorIdx: index('idx_appointments_doctor').on(table.doctorId),
}))

export type Appointment = typeof appointments.$inferSelect
export type NewAppointment = typeof appointments.$inferInsert
