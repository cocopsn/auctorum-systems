import { bigint, index, integer, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

/**
 * One row per (tenant, period). Period is YYYY-MM.
 * Counters are bumped by `usage-tracker.checkAndTrackUsage()`.
 */
export const tenantUsage = pgTable(
  'tenant_usage',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    period: varchar('period', { length: 7 }).notNull(),
    whatsappMessages:  integer('whatsapp_messages').notNull().default(0),
    apiCalls:          integer('api_calls').notNull().default(0),
    aiTokens:          bigint('ai_tokens', { mode: 'number' }).notNull().default(0),
    storageBytes:      bigint('storage_bytes', { mode: 'number' }).notNull().default(0),
    patientsCount:     integer('patients_count').notNull().default(0),
    appointmentsCount: integer('appointments_count').notNull().default(0),
    campaignsSent:     integer('campaigns_sent').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    periodUnique: uniqueIndex('tenant_usage_period_unique').on(t.tenantId, t.period),
    lookupIdx: index('idx_tenant_usage_lookup').on(t.tenantId, t.period),
  }),
)

/**
 * Add-on purchases that grant extra capacity beyond the plan's monthly cap.
 * Consumed FIFO (oldest first). `remaining` decrements as the metric is used.
 */
export const usageAddons = pgTable(
  'usage_addons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    /** Logical metric this add-on extends. Matches PLAN_LIMITS keys. */
    addonType: varchar('addon_type', { length: 40 }).notNull(),
    /** Canonical package id from ADDON_PACKAGES (e.g. 'whatsapp_500'). */
    packageId: varchar('package_id', { length: 40 }).notNull(),
    quantity:  bigint('quantity',  { mode: 'number' }).notNull(),
    remaining: bigint('remaining', { mode: 'number' }).notNull(),
    /** Price paid in centavos MXN. */
    price: integer('price').notNull(),
    paymentId: uuid('payment_id'),
    paymentProcessor: varchar('payment_processor', { length: 20 }),
    externalPaymentId: varchar('external_payment_id', { length: 255 }),
    purchasedAt: timestamp('purchased_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    lookupIdx: index('idx_usage_addons_lookup').on(t.tenantId, t.addonType, t.purchasedAt),
    externalIdx: index('idx_usage_addons_external').on(t.paymentProcessor, t.externalPaymentId),
  }),
)

export type TenantUsage = typeof tenantUsage.$inferSelect
export type NewTenantUsage = typeof tenantUsage.$inferInsert
export type UsageAddon = typeof usageAddons.$inferSelect
export type NewUsageAddon = typeof usageAddons.$inferInsert
