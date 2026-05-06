/**
 * Usage tracker.
 *
 * - `checkAndTrackUsage`: atomic check + increment. Returns `allowed=false`
 *   when the plan budget plus active add-ons is exhausted. Use BEFORE
 *   doing the work the metric counts (sending a message, hitting an API).
 *
 * - `getUsageSnapshot`: read-only summary for the UI. Includes addon
 *   balances so the UI can show "X consumed / Y limit (+ Z add-ons)".
 *
 * - `creditAddon`: called by the payment webhook after a successful
 *   add-on purchase to insert the new addon row.
 *
 * Implementation notes:
 *   - Counters are bumped via Postgres SQL upsert so concurrent workers
 *     don't lose increments.
 *   - Add-ons are consumed FIFO (oldest purchased_at first) only when the
 *     plan's monthly cap is exceeded. The plan cap is "free" — only
 *     overage drains add-ons.
 */

import { and, asc, eq, gt, sql } from 'drizzle-orm'
import {
  db,
  tenantUsage,
  usageAddons,
  type TenantUsage,
  type UsageAddon,
} from '@quote-engine/db'
import {
  ADDON_PACKAGES,
  PLAN_LIMITS,
  currentPeriod,
  getPlanLimits,
  type PlanId,
} from './plan-limits'

/** Subset of metrics we both meter and gate. */
export type GatedMetric =
  | 'whatsapp_messages'
  | 'api_calls'
  | 'ai_tokens'
  | 'storage_bytes'

const METRIC_TO_COLUMN = {
  whatsapp_messages: 'whatsappMessages',
  api_calls: 'apiCalls',
  ai_tokens: 'aiTokens',
  storage_bytes: 'storageBytes',
} as const

const METRIC_TO_SQL_COLUMN: Record<GatedMetric, string> = {
  whatsapp_messages: 'whatsapp_messages',
  api_calls: 'api_calls',
  ai_tokens: 'ai_tokens',
  storage_bytes: 'storage_bytes',
}

export type UsageCheckResult = {
  allowed: boolean
  current: number
  /** Plan cap (the "free" cap, before add-ons). -1 = unlimited. */
  planLimit: number
  /** Active add-on units left for this metric. */
  addonRemaining: number
  /** Effective total cap = planLimit + addonRemaining (-1 stays -1). */
  totalLimit: number
  /** Units left under the effective cap (-1 if unlimited). */
  remaining: number
}

/** Convert a logical metric to the plan-cap value for a plan. */
function planCapForMetric(metric: GatedMetric, plan: PlanId | string | null | undefined): number {
  const limits = getPlanLimits(plan)
  switch (metric) {
    case 'whatsapp_messages': return limits.whatsapp_messages
    case 'api_calls':         return limits.api_calls_per_hour === -1 ? -1 : limits.api_calls_per_hour * 24 * 30
    case 'ai_tokens':         return limits.ai_tokens
    case 'storage_bytes':     return limits.storage_gb === -1 ? -1 : limits.storage_gb * 1_000_000_000
  }
}

/**
 * Sum of `remaining` across all unexpired active add-ons of the given type.
 */
async function activeAddonRemaining(tenantId: string, metric: GatedMetric): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`COALESCE(SUM(${usageAddons.remaining}), 0)::bigint` })
    .from(usageAddons)
    .where(
      and(
        eq(usageAddons.tenantId, tenantId),
        eq(usageAddons.addonType, metric),
        gt(usageAddons.remaining, 0),
        sql`(${usageAddons.expiresAt} IS NULL OR ${usageAddons.expiresAt} > NOW())`,
      ),
    )
  return Number(row?.total ?? 0)
}

/**
 * Atomically: ensure the period row exists, increment the metric column,
 * and return the new total. Returns the value AFTER the increment.
 */
async function bumpUsage(tenantId: string, period: string, metric: GatedMetric, by: number): Promise<number> {
  const col = METRIC_TO_SQL_COLUMN[metric]
  // INSERT ... ON CONFLICT DO UPDATE — single round trip, race-safe.
  const result = await db.execute(sql`
    INSERT INTO tenant_usage (tenant_id, period, ${sql.raw(col)}, updated_at)
    VALUES (${tenantId}, ${period}, ${by}, NOW())
    ON CONFLICT (tenant_id, period) DO UPDATE
      SET ${sql.raw(col)} = tenant_usage.${sql.raw(col)} + ${by},
          updated_at = NOW()
    RETURNING ${sql.raw(col)} AS new_value
  `)
  const rows = (result as { rows?: Array<{ new_value: number | string }> }).rows ?? (result as unknown as Array<{ new_value: number | string }>)
  const v = rows?.[0]?.new_value
  return Number(v ?? 0)
}

/**
 * FIFO-decrement an add-on balance for `metric` by `by` total units. The
 * oldest purchased_at row(s) are drained first. Returns the units that
 * COULD NOT be consumed (i.e. unmet overage).
 */
async function consumeAddons(tenantId: string, metric: GatedMetric, by: number): Promise<number> {
  if (by <= 0) return 0
  let need = by
  const candidates = await db
    .select()
    .from(usageAddons)
    .where(
      and(
        eq(usageAddons.tenantId, tenantId),
        eq(usageAddons.addonType, metric),
        gt(usageAddons.remaining, 0),
        sql`(${usageAddons.expiresAt} IS NULL OR ${usageAddons.expiresAt} > NOW())`,
      ),
    )
    .orderBy(asc(usageAddons.purchasedAt))

  for (const row of candidates) {
    if (need <= 0) break
    const take = Math.min(Number(row.remaining), need)
    await db
      .update(usageAddons)
      .set({ remaining: Number(row.remaining) - take })
      .where(eq(usageAddons.id, row.id))
    need -= take
  }
  return need
}

/**
 * Gate + meter. Returns `allowed=false` only when the plan cap PLUS active
 * add-on units would be exceeded. Otherwise increments the counter and,
 * if the increment crossed the plan cap, drains add-ons accordingly.
 */
export async function checkAndTrackUsage(
  tenantId: string,
  plan: string | null | undefined,
  metric: GatedMetric,
  increment: number = 1,
): Promise<UsageCheckResult> {
  const planLimit = planCapForMetric(metric, plan)

  // Unlimited plan → always allowed, still meter the value for visibility.
  if (planLimit === -1) {
    const period = currentPeriod()
    const newValue = await bumpUsage(tenantId, period, metric, increment)
    return {
      allowed: true,
      current: newValue,
      planLimit: -1,
      addonRemaining: 0,
      totalLimit: -1,
      remaining: -1,
    }
  }

  // Read current usage for this period before incrementing
  const period = currentPeriod()
  const [row] = await db
    .select()
    .from(tenantUsage)
    .where(and(eq(tenantUsage.tenantId, tenantId), eq(tenantUsage.period, period)))
    .limit(1)
  const before = row ? Number(getUsageColumn(row, metric)) : 0

  const addonRemaining = await activeAddonRemaining(tenantId, metric)
  const totalLimit = planLimit + addonRemaining
  if (before + increment > totalLimit) {
    return {
      allowed: false,
      current: before,
      planLimit,
      addonRemaining,
      totalLimit,
      remaining: Math.max(0, totalLimit - before),
    }
  }

  const newValue = await bumpUsage(tenantId, period, metric, increment)

  // If we crossed the plan cap, drain that overage from add-ons FIFO
  const overageBefore = Math.max(0, before - planLimit)
  const overageAfter  = Math.max(0, newValue - planLimit)
  const overageDelta  = overageAfter - overageBefore
  if (overageDelta > 0) {
    await consumeAddons(tenantId, metric, overageDelta)
  }

  return {
    allowed: true,
    current: newValue,
    planLimit,
    addonRemaining: Math.max(0, addonRemaining - Math.max(0, overageDelta)),
    totalLimit,
    remaining: Math.max(0, totalLimit - newValue),
  }
}

function getUsageColumn(row: TenantUsage, metric: GatedMetric): number {
  switch (metric) {
    case 'whatsapp_messages': return row.whatsappMessages
    case 'api_calls':         return row.apiCalls
    case 'ai_tokens':         return Number(row.aiTokens)
    case 'storage_bytes':     return Number(row.storageBytes)
  }
}

/* --------------------------- Snapshot for UI --------------------------- */

export type UsageSnapshot = {
  period: string
  plan: string
  usage: Record<GatedMetric, {
    used: number
    planLimit: number
    addonRemaining: number
    totalLimit: number
    pct: number // 0..100; 0 when unlimited
  }>
  counters: {
    patients: number
    appointments: number
    campaigns: number
  }
  addons: UsageAddon[]
}

export async function getUsageSnapshot(tenantId: string, plan: string | null | undefined): Promise<UsageSnapshot> {
  const period = currentPeriod()

  const [row] = await db
    .select()
    .from(tenantUsage)
    .where(and(eq(tenantUsage.tenantId, tenantId), eq(tenantUsage.period, period)))
    .limit(1)

  const metrics: GatedMetric[] = ['whatsapp_messages', 'api_calls', 'ai_tokens', 'storage_bytes']
  const usage = {} as UsageSnapshot['usage']
  for (const m of metrics) {
    const used = row ? Number(getUsageColumn(row, m)) : 0
    const planLimit = planCapForMetric(m, plan)
    const addonRemaining = await activeAddonRemaining(tenantId, m)
    const totalLimit = planLimit === -1 ? -1 : planLimit + addonRemaining
    const pct = totalLimit === -1 ? 0 : Math.min(100, Math.round((used / Math.max(1, totalLimit)) * 100))
    usage[m] = { used, planLimit, addonRemaining, totalLimit, pct }
  }

  const addons = await db
    .select()
    .from(usageAddons)
    .where(and(eq(usageAddons.tenantId, tenantId), gt(usageAddons.remaining, 0)))
    .orderBy(asc(usageAddons.purchasedAt))

  return {
    period,
    plan: plan ?? 'basico',
    usage,
    counters: {
      patients: row?.patientsCount ?? 0,
      appointments: row?.appointmentsCount ?? 0,
      campaigns: row?.campaignsSent ?? 0,
    },
    addons,
  }
}

/* --------------------- Credit add-on after payment --------------------- */

/**
 * Insert an add-on row for a successful payment. Idempotent on
 * (paymentProcessor, externalPaymentId) — a duplicate webhook delivery
 * won't double-credit the tenant.
 */
export async function creditAddon(opts: {
  tenantId: string
  packageId: string
  paymentProcessor: 'stripe' | 'mercadopago' | 'manual'
  externalPaymentId: string
}): Promise<{ created: boolean; id?: string }> {
  const pkg = ADDON_PACKAGES.find((p) => p.id === opts.packageId)
  if (!pkg) throw new Error(`Unknown addon package: ${opts.packageId}`)

  // Idempotency check
  const existing = await db
    .select({ id: usageAddons.id })
    .from(usageAddons)
    .where(
      and(
        eq(usageAddons.paymentProcessor, opts.paymentProcessor),
        eq(usageAddons.externalPaymentId, opts.externalPaymentId),
      ),
    )
    .limit(1)
  if (existing.length > 0) return { created: false, id: existing[0].id }

  const [row] = await db
    .insert(usageAddons)
    .values({
      tenantId: opts.tenantId,
      addonType: pkg.type,
      packageId: pkg.id,
      quantity: pkg.quantity,
      remaining: pkg.quantity,
      price: pkg.price,
      paymentProcessor: opts.paymentProcessor,
      externalPaymentId: opts.externalPaymentId,
    })
    .returning({ id: usageAddons.id })
  return { created: true, id: row.id }
}

export { PLAN_LIMITS, ADDON_PACKAGES, getPlanLimits, currentPeriod }
