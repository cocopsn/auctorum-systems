export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthTenant } from '@/lib/auth';
import { db, tenants } from '@quote-engine/db';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// GET /api/dashboard/invoices/config
// ---------------------------------------------------------------------------
export async function GET() {
  const auth = await getAuthTenant();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [row] = await db.execute(
    sql`SELECT invoiceConfig FROM tenants WHERE id = ${auth.tenant.id}`,
  );

  return NextResponse.json({
    invoiceConfig: row?.invoiceConfig ?? null,
  });
}

// ---------------------------------------------------------------------------
// PATCH /api/dashboard/invoices/config
// ---------------------------------------------------------------------------
const invoiceConfigSchema = z.object({
  enabled: z.boolean().optional(),
  facturapiApiKey: z.string().optional(),
  emisor: z
    .object({
      rfc: z.string().optional(),
      razonSocial: z.string().optional(),
      regimenFiscal: z.string().optional(),
      codigoPostal: z.string().optional(),
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

  const parsed = invoiceConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [updated] = await db
    .update(tenants)
    .set({ invoiceConfig: parsed.data })
    .where(eq(tenants.id, auth.tenant.id))
    .returning({ invoiceConfig: tenants.invoiceConfig });

  return NextResponse.json({ invoiceConfig: updated.invoiceConfig });
}
