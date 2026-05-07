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

/**
 * Facebook / Instagram Lead Ads — separate from `meta_business` (which is
 * WhatsApp Business). This row holds the Page that runs the lead form and
 * the access token used to fetch the lead's field_data when the leadgen
 * webhook fires. `pageId` is what the webhook payload provides; we look up
 * the tenant via `WHERE type='meta_ads' AND config->>'pageId' = ?`.
 */
export interface MetaAdsConfig {
  pageId?: string
  pageName?: string
  accessToken?: string
  formIds?: string[]
  autoContact?: boolean
  autoContactMessage?: string
  autoContactDelaySec?: number
  connectedAt?: string
}

/**
 * Google Ads Lead Form Extensions — webhook-token based.
 * The doctor configures the webhook URL + token in their Google Ads UI; we
 * resolve the tenant via `WHERE type='google_ads' AND config->>'webhookToken' = ?`.
 */
export interface GoogleAdsConfig {
  webhookToken?: string
  customerId?: string
  autoContact?: boolean
  autoContactMessage?: string
  autoContactDelaySec?: number
  connectedAt?: string
}

export type IntegrationConfig =
  | MetaBusinessConfig
  | GoogleCalendarConfig
  | MetaAdsConfig
  | GoogleAdsConfig
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
