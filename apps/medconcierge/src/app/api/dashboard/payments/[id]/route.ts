export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthTenant } from '@/lib/auth';
import { db, payments } from '@quote-engine/db';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { validateOrigin } from '@/lib/csrf'

// ---------------------------------------------------------------------------
// PATCH /api/dashboard/payments/[id]
// ---------------------------------------------------------------------------
const updateStatusSchema = z.object({
  status: z.enum(['pending', 'completed', 'failed', 'refunded'], {
    errorMap: () => ({ message: 'Estado debe ser: pending, completed, failed o refunded' }),
  }),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
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

  // If marking as completed, set paid_at timestamp
  if (parsed.data.status === 'completed') {
    updateData.paidAt = new Date();
  }

  const [updated] = await db
    .update(payments)
    .set(updateData)
    .where(and(eq(payments.id, params.id), eq(payments.tenantId, auth.tenant.id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 });
  }

  return NextResponse.json({ payment: updated });
}
