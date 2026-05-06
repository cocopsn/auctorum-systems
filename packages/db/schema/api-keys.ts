import { boolean, index, integer, jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

/**
 * Public API keys per tenant.
 *
 * The plaintext key (`ak_live_<random hex>`) is generated server-side and
 * returned to the user **only at creation**. We store the SHA-256 hash
 * (`keyHash`) for verification and a short prefix (`keyPrefix`) so the UI
 * can display "ak_live_a1b2…" without exposing the secret.
 */
export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    keyHash: varchar('key_hash', { length: 64 }).notNull(),
    keyPrefix: varchar('key_prefix', { length: 20 }).notNull(),
    permissions: jsonb('permissions').notNull().default(['read']),
    rateLimit: integer('rate_limit').notNull().default(100),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    isActive: boolean('is_active').notNull().default(true),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    hashIdx: index('idx_api_keys_hash').on(table.keyHash),
    tenantIdx: index('idx_api_keys_tenant').on(table.tenantId, table.isActive),
  }),
)

export type ApiKey = typeof apiKeys.$inferSelect
export type NewApiKey = typeof apiKeys.$inferInsert
export type ApiPermission = 'read' | 'write' | 'delete'
