import { pgTable, uuid, varchar, integer, time, boolean, date, text, timestamp, unique, check } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { tenants } from './tenants'

export const schedules = pgTable('schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  dayOfWeek: integer('day_of_week').notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  slotDurationMin: integer('slot_duration_min').default(30),
  isActive: boolean('is_active').default(true),
  location: varchar('location', { length: 255 }),
}, (table) => ({
  uniqueTenantDayTime: unique('uq_schedules_tenant_day_time').on(table.tenantId, table.dayOfWeek, table.startTime),
  dayOfWeekCheck: check('chk_day_of_week', sql`${table.dayOfWeek} BETWEEN 0 AND 6`),
}))

export const scheduleBlocks = pgTable('schedule_blocks', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  reason: varchar('reason', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export type Schedule = typeof schedules.$inferSelect
export type NewSchedule = typeof schedules.$inferInsert
export type ScheduleBlock = typeof scheduleBlocks.$inferSelect
