/**
 * Per-tenant AI token budget check against existing ai_usage_events schema.
 * Uses input_tokens + output_tokens (existing columns).
 */
import { db } from '@quote-engine/db';
import { sql } from 'drizzle-orm';

// Limits by tenants.plan value (existing values: 'basico', 'profesional', ...).
const PLAN_LIMITS: Record<string, { daily: number; monthly: number }> = {
  basico: { daily: 5_000, monthly: 100_000 },
  profesional: { daily: 50_000, monthly: 1_000_000 },
  enterprise: { daily: Number.POSITIVE_INFINITY, monthly: Number.POSITIVE_INFINITY },
};

export type BudgetCheckResult = {
  canProceed: boolean;
  reason?: string;
  usage: { today: number; thisMonth: number };
  limits: { daily: number; monthly: number };
};

export async function getTenantUsage(tenantId: string): Promise<{ today: number; thisMonth: number }> {
  try {
    const rows = (await db.execute(sql`
      SELECT
        COALESCE(SUM(CASE WHEN created_at >= CURRENT_DATE THEN COALESCE(input_tokens,0) + COALESCE(output_tokens,0) ELSE 0 END), 0) AS today,
        COALESCE(SUM(CASE WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN COALESCE(input_tokens,0) + COALESCE(output_tokens,0) ELSE 0 END), 0) AS month
      FROM ai_usage_events
      WHERE tenant_id = ${tenantId}::uuid
    `)) as unknown as Array<{ today: number | string; month: number | string }>;
    const row = rows[0];
    return {
      today: Number(row?.today ?? 0),
      thisMonth: Number(row?.month ?? 0),
    };
  } catch (e) {
    console.warn('[ai/budget] getTenantUsage failed (non-blocking):', (e as Error).message);
    return { today: 0, thisMonth: 0 };
  }
}

export async function checkTenantBudget(
  tenantId: string,
  plan: string | null | undefined,
): Promise<BudgetCheckResult> {
  const limits = PLAN_LIMITS[plan || 'basico'] ?? PLAN_LIMITS.basico;
  const usage = await getTenantUsage(tenantId);

  if (usage.today >= limits.daily) {
    return {
      canProceed: false,
      reason: `Daily token limit reached (${limits.daily})`,
      usage,
      limits,
    };
  }
  if (usage.thisMonth >= limits.monthly) {
    return {
      canProceed: false,
      reason: `Monthly token limit reached (${limits.monthly})`,
      usage,
      limits,
    };
  }
  return { canProceed: true, usage, limits };
}
