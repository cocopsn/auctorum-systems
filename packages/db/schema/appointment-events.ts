import { pgTable, uuid, varchar, jsonb, timestamp, index } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { appointments } from './appointments'

export const appointmentEvents = pgTable('appointment_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  appointmentId: uuid('appointment_id').notNull().references(() => appointments.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  eventType: varchar('event_type', { length: 30 }).notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  appointmentIdx: index('idx_appt_events_appointment').on(table.appointmentId),
}))

export type AppointmentEvent = typeof appointmentEvents.$inferSelect
