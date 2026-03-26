import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // References auth.users(id) in Supabase
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  role: varchar('role', { length: 20 }).default('admin'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
