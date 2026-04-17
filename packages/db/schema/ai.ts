import { boolean, integer, pgTable, text, timestamp, uuid, varchar, decimal, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

export const aiKnowledgeFiles = pgTable('ai_knowledge_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  uploadedBy: uuid('uploaded_by').references(() => users.id),
  openaiFileId: varchar('openai_file_id', { length: 255 }).notNull(),
  vectorStoreId: varchar('vector_store_id', { length: 255 }).notNull(),
  fileName: varchar('file_name', { length: 500 }).notNull(),
  mimeType: varchar('mime_type', { length: 255 }).notNull(),
  sizeBytes: decimal('size_bytes', { precision: 14, scale: 0 }).notNull(),
  status: varchar('status', { length: 30 }).default('processing'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  tenantIdx: index('idx_ai_knowledge_files_tenant').on(table.tenantId),
}));

export const aiUsageEvents = pgTable('ai_usage_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id),
  channel: varchar('channel', { length: 30 }).notNull().default('playground'),
  prompt: text('prompt').notNull(),
  responseSummary: text('response_summary'),
  model: varchar('model', { length: 100 }).notNull(),
  responseId: varchar('response_id', { length: 255 }),
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  latencyMs: integer('latency_ms'),
  resolved: boolean('resolved').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  tenantIdx: index('idx_ai_usage_events_tenant').on(table.tenantId),
}));

export type AiKnowledgeFile = typeof aiKnowledgeFiles.$inferSelect;
export type NewAiKnowledgeFile = typeof aiKnowledgeFiles.$inferInsert;
export type AiUsageEvent = typeof aiUsageEvents.$inferSelect;
export type NewAiUsageEvent = typeof aiUsageEvents.$inferInsert;
