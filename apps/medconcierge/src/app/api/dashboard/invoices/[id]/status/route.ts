export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthTenant } from '@/lib/auth';
import { db, invoices } from '@quote-engine/db';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { validateOrigin } from '@/lib/csrf'

// ---------------------------------------------------------------------------
// PATCH /api/dashboard/invoices/[id]/status
// ---------------------------------------------------------------------------
const updateStatusSchema = z.object({
  status: z.enum(['pending', 'stamped', 'cancelled', 'error'], {
    errorMap: () => ({ message: 'Estado debe ser: pending, stamped, cancelled o error' }),
  }),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    if (!validateOrigin(request)) return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });

    const auth = await getAuthTenant();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = updateStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      status: parsed.data.status,
    };

    // If marking as stamped, set stamped_at
    if (parsed.data.status === 'stamped') {
      updateData.stampedAt = new Date();
    }

    const [updated] = await db
      .update(invoices)
      .set(updateData)
      .where(and(eq(invoices.id, params.id), eq(invoices.tenantId, auth.tenant.id)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ invoice: updated });
  } catch (err) {
    console.error('[PATCH /api/dashboard/invoices/[id]/status] error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
