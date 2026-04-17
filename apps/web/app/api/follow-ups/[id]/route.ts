export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db, followUps } from '@quote-engine/db';
import { getAuthTenant } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { validateOrigin } from '@/lib/csrf';

const patchSchema = z.object({
  status: z.enum(['scheduled', 'sent', 'responded', 'cancelled']).optional(),
  sentAt: z.string().datetime().optional(),
  scheduledAt: z.string().datetime().optional(),
  messageTemplate: z.string().max(4000).optional().nullable(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!validateOrigin(request)) return apiError(403, 'Invalid origin');
    const auth = await getAuthTenant();
    if (!auth) return apiError(401, 'Unauthorized');

    const body = await request.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return apiError(400, 'Invalid body', parsed.error.errors);

    const set: Record<string, unknown> = {};
    if (parsed.data.status !== undefined) set.status = parsed.data.status;
    if (parsed.data.sentAt !== undefined) set.sentAt = new Date(parsed.data.sentAt);
    if (parsed.data.scheduledAt !== undefined) set.scheduledAt = new Date(parsed.data.scheduledAt);
    if (parsed.data.messageTemplate !== undefined) set.messageTemplate = parsed.data.messageTemplate;

    const [updated] = await db
      .update(followUps)
      .set(set)
      .where(and(eq(followUps.id, params.id), eq(followUps.tenantId, auth.tenant.id)))
      .returning();

    if (!updated) return apiError(404, 'Not found');
    return apiSuccess(updated);


  } catch (error) {
    console.error('/api/follow-ups/[id] PATCH error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!validateOrigin(request)) return apiError(403, 'Invalid origin');
    const auth = await getAuthTenant();
    if (!auth) return apiError(401, 'Unauthorized');

    const result = await db
      .delete(followUps)
      .where(and(eq(followUps.id, params.id), eq(followUps.tenantId, auth.tenant.id)))
      .returning({ id: followUps.id });

    if (result.length === 0) return apiError(404, 'Not found');
    return apiSuccess({ id: params.id, deleted: true });


  } catch (error) {
    console.error('/api/follow-ups/[id] DELETE error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
