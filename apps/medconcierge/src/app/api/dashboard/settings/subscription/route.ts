export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthTenant } from '@/lib/auth';
import { db, tenants } from '@quote-engine/db';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { validateOrigin } from '@/lib/csrf'

// GET /api/dashboard/settings/subscription
// Returns the current subscription for the tenant
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthTenant();
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const result = await db.execute(
      sql`SELECT id, tenant_id, plan, status, amount, currency, billing_cycle, current_period_start, current_period_end, payment_method, processor_subscription_id, stripe_customer_id, grace_period_days, cancelled_at, created_at, updated_at FROM subscriptions WHERE tenant_id = ${auth.tenant.id}`
    ) as any[];

    const row = result[0] ?? null;

    return NextResponse.json({ subscription: row });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Error al obtener suscripcion' },
      { status: 500 }
    );
  }
}

// PATCH /api/dashboard/settings/subscription
// Update the plan
const PLAN_AMOUNTS: Record<string, number> = {
  basico: 1400,
  auctorum: 1800,
  enterprise: 0,
};

const patchSchema = z.object({
  plan: z.enum(['basico', 'auctorum', 'enterprise']),
});

export async function PATCH(request: NextRequest) {
  if (!validateOrigin(request)) return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });

  try {
    const auth = await getAuthTenant();
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Plan invalido', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { plan } = parsed.data;
    const amount = PLAN_AMOUNTS[plan];

    // Check if subscription exists
    const existing = await db.execute(
      sql`SELECT id FROM subscriptions WHERE tenant_id = ${auth.tenant.id}`
    );

    if (existing.length > 0) {
      // Update existing subscription
      await db.execute(
        sql`UPDATE subscriptions SET plan = ${plan}, amount = ${amount}, status = 'active', current_period_start = NOW(), current_period_end = NOW() + INTERVAL '30 days', cancelled_at = NULL, updated_at = NOW() WHERE tenant_id = ${auth.tenant.id}`
      );
    } else {
      // Create new subscription
      await db.execute(
        sql`INSERT INTO subscriptions (tenant_id, plan, status, amount, currency, billing_cycle, current_period_start, current_period_end, grace_period_days, created_at, updated_at) VALUES (${auth.tenant.id}, ${plan}, 'active', ${amount}, 'MXN', 'monthly', NOW(), NOW() + INTERVAL '30 days', 3, NOW(), NOW())`
      );
    }

    await db.execute(
      sql`UPDATE tenants SET plan = ${plan}, provisioning_status = 'active', provisioned_at = NOW(), updated_at = NOW() WHERE id = ${auth.tenant.id}`
    );

    // Fetch updated subscription
    const result = await db.execute(
      sql`SELECT id, tenant_id, plan, status, amount, currency, billing_cycle, current_period_start, current_period_end, payment_method, processor_subscription_id, stripe_customer_id, grace_period_days, cancelled_at, created_at, updated_at FROM subscriptions WHERE tenant_id = ${auth.tenant.id}`
    ) as any[];

    return NextResponse.json({ subscription: result[0] ?? null });
  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json(
      { error: 'Error al actualizar suscripcion' },
      { status: 500 }
    );
  }
}
