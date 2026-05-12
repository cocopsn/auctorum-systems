export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthTenant } from '@/lib/auth';
import { db, tenants } from '@quote-engine/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// Pre-2026-05-11 this endpoint wrote to `tenants.payment_config` (a
// top-level JSONB column on the tenants table), but the only consumer
// — `getPaymentProvider()` in packages/payments — reads
// `tenant.config.paymentConfig` (a nested key inside the OTHER `config`
// JSONB column). So no matter what keys the doctor saved, every call
// to /api/dashboard/payments/create-link returned "No payment provider
// configured". Form was decorative.
//
// We now read and write through the same nested path the resolver
// uses: `tenant.config.paymentConfig`. The legacy top-level column
// stays in the schema for one migration cycle in case any external
// consumer relied on it; new writes go to the nested location.

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
      webhookSecret: z.string().optional(),
    })
    .optional(),
  manual: z
    .object({
      enabled: z.boolean().optional(),
    })
    .optional(),
});

// ---------------------------------------------------------------------------
// GET — read the current paymentConfig from the same nested path the
// resolver uses. Pre-2026-05-11 we read `payment_config` top-level and
// the form showed empty even when saved.
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const auth = await getAuthTenant();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [tenant] = await db
      .select({ config: tenants.config })
      .from(tenants)
      .where(eq(tenants.id, auth.tenant.id))
      .limit(1);

    const cfg = (tenant?.config as Record<string, unknown> | null) ?? {};
    const paymentConfig =
      (cfg.paymentConfig as Record<string, unknown> | undefined) ?? null;

    return NextResponse.json({ paymentConfig });
  } catch (err) {
    console.error('Payments config GET error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH — write to `tenant.config.paymentConfig` so getPaymentProvider
// can resolve it. We merge with the existing `config` JSONB so we don't
// stomp on other sections (colors, contact, schedule_settings, etc.).
// ---------------------------------------------------------------------------
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

  const [current] = await db
    .select({ config: tenants.config })
    .from(tenants)
    .where(eq(tenants.id, auth.tenant.id))
    .limit(1);

  const existingConfig =
    (current?.config as Record<string, unknown> | null) ?? {};

  const newConfig = {
    ...existingConfig,
    paymentConfig: parsed.data,
  };

  const [updated] = await db
    .update(tenants)
    .set({ config: newConfig, updatedAt: new Date() })
    .where(eq(tenants.id, auth.tenant.id))
    .returning({ config: tenants.config });

  const updatedPaymentConfig =
    (updated?.config as Record<string, unknown> | null)?.paymentConfig ?? null;

  return NextResponse.json({ paymentConfig: updatedPaymentConfig });
}
