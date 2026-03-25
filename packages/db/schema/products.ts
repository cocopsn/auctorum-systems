import { pgTable, uuid, varchar, text, decimal, boolean, integer, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  sku: varchar('sku', { length: 100 }),
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
  unitType: varchar('unit_type', { length: 50 }).default('pieza'),
  imageUrl: text('image_url'),
  category: varchar('category', { length: 100 }),
  isActive: boolean('is_active').default(true),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
