import { pgTable, uuid, varchar, jsonb, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

export type MetaBusinessMode =
  | 'managed_shared_waba'
  | 'managed_dedicated_number'
  | 'doctor_owned_meta'

export type GoogleCalendarMode =
  | 'managed_shared_service_account'
  | 'oauth_embedded'
  | 'manual_service_account'

export interface MetaBusinessConfig {
  mode?: MetaBusinessMode
  waba_id?: string
  phone_number_id?: string
  business_account_id?: string
  access_token_ref?: string
  webhook_status?: 'pending' | 'connected' | 'error'
}

export interface GoogleCalendarConfig {
  mode?: GoogleCalendarMode
  calendar_id?: string
  credential_ref?: string
  sync_status?: 'pending' | 'connected' | 'error'
}

export type IntegrationConfig =
  | MetaBusinessConfig
  | GoogleCalendarConfig
  | Record<string, unknown>

export const integrations = pgTable('integrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(),
  status: varchar('status', { length: 20 }).default('disconnected'),
  config: jsonb('config').$type<IntegrationConfig>().default({}),
  lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
  tenantTypeIdx: uniqueIndex('integrations_tenant_type').on(t.tenantId, t.type),
}))

export type Integration = typeof integrations.$inferSelect
export type NewIntegration = typeof integrations.$inferInsert
