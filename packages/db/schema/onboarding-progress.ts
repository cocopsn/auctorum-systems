import { pgTable, uuid, jsonb, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

/**
 * Onboarding progress — one row per tenant tracking the setup wizard state.
 * stepsJson is a free-form bag of booleans; the shape is documented in the
 * OnboardingSteps type below but NOT enforced at the DB level.
 */
export type OnboardingSteps = {
  plan_confirmed?: boolean
  business_configured?: boolean
  branding_configured?: boolean
  whatsapp_mode_selected?: boolean
  whatsapp_connected?: boolean
  google_connected?: boolean
  first_product_or_service?: boolean
  schedule_configured?: boolean
  public_portal_published?: boolean
  test_quote_or_appointment?: boolean
  onboarding_completed?: boolean
}

export const onboardingProgress = pgTable('onboarding_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  stepsJson: jsonb('steps_json').$type<OnboardingSteps>().notNull().default({}),
  vertical: jsonb('vertical').$type<{ tenantType?: string; plan?: string }>().default({}),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  tenantUniqueIdx: uniqueIndex('uniq_onboarding_tenant').on(t.tenantId),
}))

export type OnboardingProgress = typeof onboardingProgress.$inferSelect
export type NewOnboardingProgress = typeof onboardingProgress.$inferInsert
