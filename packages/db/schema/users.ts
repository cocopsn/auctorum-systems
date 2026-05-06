import { pgTable, uuid, varchar, boolean, text, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // References auth.users(id) in Supabase
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  role: varchar('role', { length: 20 }).default('admin'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  // Tier 2 columns
  isActive: boolean('is_active').default(true),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  invitedBy: uuid('invited_by'),
  // Tier 3 columns
  twoFactorEnabled: boolean('two_factor_enabled').default(false),
  twoFactorSecret: text('two_factor_secret'),
  twoFactorVerifiedAt: timestamp('two_factor_verified_at', { withTimezone: true }),
  // Mobile app push notifications
  expoPushToken: varchar('expo_push_token', { length: 255 }),
  pushPlatform: varchar('push_platform', { length: 20 }),
  pushTokenUpdatedAt: timestamp('push_token_updated_at', { withTimezone: true }),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
