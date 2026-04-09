export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db, botFaqs } from '@quote-engine/db';
import { getAuthTenant } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { validateOrigin } from '@/lib/csrf';

const putSchema = z.object({
  question: z.string().min(1).max(2000).optional(),
  answer: z.string().min(1).max(8000).optional(),
  priority: z.number().int().min(0).max(1000).optional(),
  active: z.boolean().optional(),
});

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  if (!validateOrigin(request)) return apiError(403, 'Invalid origin');
  const auth = await getAuthTenant();
  if (!auth) return apiError(401, 'Unauthorized');

  const body = await request.json().catch(() => ({}));
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) return apiError(400, 'Invalid body', parsed.error.errors);

  const [updated] = await db
    .update(botFaqs)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(botFaqs.id, params.id), eq(botFaqs.tenantId, auth.tenant.id)))
    .returning();

  if (!updated) return apiError(404, 'Not found');
  return apiSuccess(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  if (!validateOrigin(request)) return apiError(403, 'Invalid origin');
  const auth = await getAuthTenant();
  if (!auth) return apiError(401, 'Unauthorized');

  const result = await db
    .delete(botFaqs)
    .where(and(eq(botFaqs.id, params.id), eq(botFaqs.tenantId, auth.tenant.id)))
    .returning({ id: botFaqs.id });

  if (result.length === 0) return apiError(404, 'Not found');
  return apiSuccess({ id: params.id, deleted: true });
}
