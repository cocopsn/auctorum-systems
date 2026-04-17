export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthTenant } from '@/lib/auth';
import { db, tenants } from '@quote-engine/db';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// GET /api/dashboard/payments/config
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const auth = await getAuthTenant();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [row] = await db.execute(
      sql`SELECT payment_config FROM tenants WHERE id = ${auth.tenant.id}`,
    ) as any[];

    return NextResponse.json({
      paymentConfig: (row as any)?.payment_config ?? null,
    });
  } catch (err: any) {
    console.error('Payments config GET error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/dashboard/payments/config
// ---------------------------------------------------------------------------
const paymentConfigSchema = z.object({
  activeProcessor: z.enum(['manual', 'mercadopago', 'stripe']).optional(),
  mercadopago: z
    .object({
      accessToken: z.string().optional(),
      enabled: z.boolean().optional(),
    })
    .optional(),
  stripe: z
    .object({
      secretKey: z.string().optional(),
      enabled: z.boolean().optional(),
    })
    .optional(),
  manual: z
    .object({
      enabled: z.boolean().optional(),
    })
    .optional(),
});

export async function PATCH(request: NextRequest) {
  const auth = await getAuthTenant();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = paymentConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [updated] = await db
    .update(tenants)
    .set({ paymentConfig: parsed.data })
    .where(eq(tenants.id, auth.tenant.id))
    .returning({ paymentConfig: tenants.paymentConfig });

  return NextResponse.json({ paymentConfig: updated.paymentConfig });
}
