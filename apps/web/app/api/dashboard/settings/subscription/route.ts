export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthTenant } from '@/lib/auth';
import { db, subscriptions, tenants } from '@quote-engine/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

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
// Update the plan
const PLAN_AMOUNTS: Record<string, number> = {
  basico: 1400,
  auctorum: 1800,
};

const patchSchema = z.object({
  plan: z.enum(['basico', 'auctorum']),
});

export async function PATCH(request: NextRequest) {
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
    const [existing] = await db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(eq(subscriptions.tenantId, auth.tenant.id))
      .limit(1);

    if (existing) {
      await db
        .update(subscriptions)
        .set({
          plan,
          amount: String(amount),
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          cancelledAt: null,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.tenantId, auth.tenant.id));
    } else {
      await db.insert(subscriptions).values({
        tenantId: auth.tenant.id,
        plan,
        status: 'active',
        amount: String(amount),
        currency: 'MXN',
        billingCycle: 'monthly',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        gracePeriodDays: 3,
      });
    }

    await db
      .update(tenants)
      .set({
        plan,
        provisioningStatus: 'active',
        provisionedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, auth.tenant.id));

    // Fetch updated subscription
    const [updated] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.tenantId, auth.tenant.id))
      .limit(1);

    return NextResponse.json({ subscription: updated ?? null });
  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json(
      { error: 'Error al actualizar suscripcion' },
      { status: 500 }
    );
  }
}
