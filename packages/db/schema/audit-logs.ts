import { pgTable, uuid, text, timestamp, jsonb, varchar } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  userId: uuid('user_id'), // Optional, as some actions are performed by system
  action: varchar('action', { length: 255 }).notNull(),
  entity: varchar('entity', { length: 255 }).notNull(),
  beforeState: jsonb('before').default({}),
  afterState: jsonb('after').default({}),
  ipAddress: varchar('ip', { length: 45 }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
});
