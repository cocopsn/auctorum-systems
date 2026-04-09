export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db, conversations } from '@quote-engine/db';
import { getAuthTenant } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { validateOrigin } from '@/lib/csrf';

const schema = z.object({ paused: z.boolean() });

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  if (!validateOrigin(request)) return apiError(403, 'Invalid origin');
  const auth = await getAuthTenant();
  if (!auth) return apiError(401, 'Unauthorized');

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(400, 'Invalid body', parsed.error.errors);

  const [updated] = await db
    .update(conversations)
    .set({ botPaused: parsed.data.paused, updatedAt: new Date() })
    .where(and(eq(conversations.id, params.id), eq(conversations.tenantId, auth.tenant.id)))
    .returning();

  if (!updated) return apiError(404, 'Not found');
  return apiSuccess({ id: updated.id, botPaused: updated.botPaused });
}
