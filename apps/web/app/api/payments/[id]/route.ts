export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { db, payments } from '@quote-engine/db';
import { getAuthTenant } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { validateOrigin } from '@/lib/csrf';

const patchSchema = z.object({
  status: z.enum(['pending', 'completed', 'failed', 'refunded']).optional(),
  notes: z.string().max(2000).optional().nullable(),
  reference: z.string().max(255).optional().nullable(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!validateOrigin(request)) return apiError(403, 'Invalid origin');
    const auth = await getAuthTenant();
    if (!auth) return apiError(401, 'Unauthorized');

    const body = await request.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return apiError(400, 'Invalid body', parsed.error.errors);

    const [updated] = await db
      .update(payments)
      .set(parsed.data)
      .where(
        and(
          eq(payments.id, params.id),
          eq(payments.tenantId, auth.tenant.id),
          isNull(payments.deletedAt),
        ),
      )
      .returning();

    if (!updated) return apiError(404, 'Not found');
    return apiSuccess(updated);


  } catch (error) {
    console.error('/api/payments/[id] PATCH error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!validateOrigin(request)) return apiError(403, 'Invalid origin');
    const auth = await getAuthTenant();
    if (!auth) return apiError(401, 'Unauthorized');

    const [updated] = await db
      .update(payments)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(payments.id, params.id),
          eq(payments.tenantId, auth.tenant.id),
          isNull(payments.deletedAt),
        ),
      )
      .returning({ id: payments.id });

    if (!updated) return apiError(404, 'Not found');
    return apiSuccess({ id: updated.id, deleted: true });


  } catch (error) {
    console.error('/api/payments/[id] DELETE error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
