import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

/**
 * Browser Web Push subscription store. Each row is one device/browser
 * combination (a single user can have many — laptop Chrome + phone Safari +
 * tablet Edge, etc.). The endpoint URL is unique globally and acts as the
 * identity key, so re-subscribing from the same browser is idempotent.
 *
 * We keep `tenantId` on the row so the worker can fan out per-tenant pushes
 * without joining `users` every time.
 */
export const webPushSubscriptions = pgTable('web_push_subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh').notNull(),
  authKey: text('auth_key').notNull(),
  userAgent: varchar('user_agent', { length: 512 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  tenantIdx: index('web_push_subs_tenant_idx').on(table.tenantId),
  userIdx: index('web_push_subs_user_idx').on(table.userId),
}));

export type WebPushSubscription = typeof webPushSubscriptions.$inferSelect;
export type NewWebPushSubscription = typeof webPushSubscriptions.$inferInsert;
