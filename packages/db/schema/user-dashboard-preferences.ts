import { pgTable, uuid, jsonb, varchar, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { users } from './users'

export const userDashboardPreferences = pgTable('user_dashboard_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  hiddenWidgets: jsonb('hidden_widgets').$type<string[]>().notNull().default([]),
  widgetOrder: jsonb('widget_order').$type<string[]>().notNull().default([]),
  defaultLandingModule: varchar('default_landing_module', { length: 80 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueUserTenantIdx: uniqueIndex('uniq_dashboard_preferences_user_tenant').on(table.userId, table.tenantId),
}))

export type UserDashboardPreference = typeof userDashboardPreferences.$inferSelect
export type NewUserDashboardPreference = typeof userDashboardPreferences.$inferInsert
