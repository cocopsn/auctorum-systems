import { pgTable, uuid, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { clients } from './clients'
import { funnelStages } from './funnel-stages'
import { users } from './users'

/**
 * Client-funnel — links a client to their CURRENT funnel stage.
 * One row per client (unique on clientId). Moves are recorded by overwriting
 * stageId/movedAt; if we ever need history we can add a `client_funnel_history` table.
 */
export const clientFunnel = pgTable('client_funnel', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  stageId: uuid('stage_id').notNull().references(() => funnelStages.id, { onDelete: 'cascade' }),
  movedAt: timestamp('moved_at', { withTimezone: true }).defaultNow().notNull(),
  movedBy: uuid('moved_by').references(() => users.id, { onDelete: 'set null' }),
}, (t) => ({
  clientUniqueIdx: uniqueIndex('uniq_client_funnel_client').on(t.clientId),
}))

export type ClientFunnel = typeof clientFunnel.$inferSelect
export type NewClientFunnel = typeof clientFunnel.$inferInsert
