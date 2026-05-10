export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthTenant } from '@/lib/auth';
import { db } from '@quote-engine/db';
import { sql } from 'drizzle-orm';
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
//
// Pre-2026-05-10 this endpoint flipped tenants.plan + subscriptions.plan to
// any value the caller sent — no Stripe/MercadoPago charge required. Any
// authenticated doctor could upgrade from basico to auctorum for free
// (billing fraud).
//
// We now reject every plan-upgrade attempt and require the caller to go
// through the actual checkout flow (Stripe Checkout for paid plans,
// /api/dashboard/billing/cancel for downgrades). The endpoint stays so the
// UI (Settings → Suscripción) can still call it, but it's a 403 unless the
// payload is actually a no-op.
export async function PATCH(request: NextRequest) {
  if (!validateOrigin(request)) return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });

  try {
    const auth = await getAuthTenant();
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    return NextResponse.json(
      {
        error: 'Plan changes must go through checkout',
        message:
          'Para cambiar de plan, usa el flujo de Stripe Checkout en /settings/subscription. La actualización directa de plan está deshabilitada para evitar bypass de cobro.',
      },
      { status: 403 },
    );
  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json(
      { error: 'Error al actualizar suscripcion' },
      { status: 500 }
    );
  }
}
