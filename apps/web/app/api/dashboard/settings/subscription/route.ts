export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthTenant } from '@/lib/auth';
import { db, subscriptions } from '@quote-engine/db';
import { eq } from 'drizzle-orm';

// GET /api/dashboard/settings/subscription
// Returns the current subscription for the tenant
export async function GET() {
  try {
    const auth = await getAuthTenant();
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const [row] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.tenantId, auth.tenant.id))
      .limit(1);

    return NextResponse.json({ subscription: row ?? null });
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
// Pre-2026-05-11 this endpoint flipped tenants.plan + subscriptions.plan to
// any value the caller sent — no Stripe / MercadoPago charge required. Any
// authenticated user could upgrade from basico to auctorum for free
// (billing fraud, identical fix to the one already applied in medconcierge
// — commit 2026-05-10).
//
// Plan changes now MUST go through the actual billing flow:
//   - upgrade → POST /api/dashboard/billing/checkout (Stripe) or
//     /api/dashboard/billing/checkout-mp (MercadoPago)
//   - downgrade → /api/dashboard/billing/cancel (provider portal)
//
// The PATCH stays here so the dashboard UI gets a clear 403 + redirect
// instead of mysteriously failing.
export async function PATCH(_request: NextRequest) {
  try {
    const auth = await getAuthTenant();
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    return NextResponse.json(
      {
        error: 'Plan changes must go through checkout',
        message:
          'Para cambiar de plan debes completar el pago. Inicia el flujo de checkout desde /dashboard/settings/subscription.',
        code: 'CHECKOUT_REQUIRED',
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
