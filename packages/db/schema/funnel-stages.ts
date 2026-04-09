import { pgTable, uuid, varchar, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

/**
 * Funnel stages — Kanban columns for the sales pipeline.
 * Each tenant gets 5 default stages auto-seeded on first GET /api/funnel:
 *   Nuevo contacto, Interesado, Cita agendada, Confirmada, Atendido.
 * Position is the column order (lower = earlier in the funnel).
 */
export const funnelStages = pgTable('funnel_stages', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  position: integer('position').notNull().default(0),
  color: varchar('color', { length: 7 }).notNull().default('#6366f1'), // hex
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  tenantPosIdx: index('idx_funnel_stages_tenant_pos').on(t.tenantId, t.position),
}))

export type FunnelStage = typeof funnelStages.$inferSelect
export type NewFunnelStage = typeof funnelStages.$inferInsert
