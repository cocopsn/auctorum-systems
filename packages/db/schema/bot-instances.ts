import { pgTable, uuid, varchar, jsonb, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

export const botInstances = pgTable('bot_instances', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  channel: varchar('channel', { length: 50 }).notNull(),
  provider: varchar('provider', { length: 50 }).notNull(),
  externalBotId: varchar('external_bot_id', { length: 255 }),
  externalPhoneNumberId: varchar('external_phone_number_id', { length: 255 }),
  status: varchar('status', { length: 30 }).notNull().default('draft'),
  config: jsonb('config').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueTenantChannelProviderIdx: uniqueIndex('uniq_bot_instances_tenant_channel_provider').on(
    table.tenantId,
    table.channel,
    table.provider,
  ),
}))

export type BotInstance = typeof botInstances.$inferSelect
export type NewBotInstance = typeof botInstances.$inferInsert
