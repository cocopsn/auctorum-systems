export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { db, invoices } from '@quote-engine/db';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// PATCH /api/dashboard/invoices/[id]/status
// ---------------------------------------------------------------------------
const updateStatusSchema = z.object({
  status: z.enum(['pending', 'stamped', 'cancelled', 'error'], {
    errorMap: () => ({ message: 'Estado debe ser: pending, stamped, cancelled o error' }),
  }),
});

// Valid invoice status transitions (H6)
const validTransitions: Record<string, string[]> = {
  pending: ['stamped', 'cancelled'],
  stamped: ['cancelled'],
  cancelled: [],
  error: ['pending'],
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireRole(['admin']);
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

  // Fetch current invoice to check transition (H6)
  const [current] = await db
    .select({ status: invoices.status })
    .from(invoices)
    .where(and(eq(invoices.id, params.id), eq(invoices.tenantId, auth.tenant.id)))
    .limit(1);

  if (!current) {
    return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 });
  }

  const currentStatus = current.status || 'pending';
  const allowed = validTransitions[currentStatus] || [];
  if (!allowed.includes(parsed.data.status)) {
    return NextResponse.json(
      { error: `Transicion no permitida: ${currentStatus} -> ${parsed.data.status}` },
      { status: 400 }
    );
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
}
