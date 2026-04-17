import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
// Define a custom type since drizzle handles custom pg types via customType()
import { customType } from 'drizzle-orm/pg-core';

const vectorType = customType<{ data: number[] }>({
  dataType() {
    return 'vector(1536)';
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
});

export const knowledgeBase = pgTable('knowledge_base', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  embedding: vectorType('embedding').notNull(),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
});
