import { pgTable, uuid, varchar, decimal, integer, timestamp } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }).unique(),
  plan: varchar('plan', { length: 50 }).default('free'),
  status: varchar('status', { length: 20 }).default('active'),
  amount: decimal('amount', { precision: 12, scale: 2 }).default('0'),
  currency: varchar('currency', { length: 3 }).default('MXN'),
  billingCycle: varchar('billing_cycle', { length: 20 }).default('monthly'),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  paymentMethod: varchar('payment_method', { length: 50 }),
  processorSubscriptionId: varchar('processor_subscription_id', { length: 255 }),
  gracePeriodDays: integer('grace_period_days').default(3),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export type Subscription = typeof subscriptions.$inferSelect
export type NewSubscription = typeof subscriptions.$inferInsert
