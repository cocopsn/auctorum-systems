export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db, clientFunnel, clients, funnelStages } from '@quote-engine/db';
import { getAuthTenant } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { validateOrigin } from '@/lib/csrf';

const schema = z.object({
  clientId: z.string().uuid(),
  stageId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) return apiError(403, 'Invalid origin');
  const auth = await getAuthTenant();
  if (!auth) return apiError(401, 'Unauthorized');

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(400, 'Invalid body', parsed.error.errors);

  // Verify both client and stage belong to this tenant.
  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, parsed.data.clientId), eq(clients.tenantId, auth.tenant.id)))
    .limit(1);
  if (!client) return apiError(404, 'Client not found');

  const [stage] = await db
    .select({ id: funnelStages.id })
    .from(funnelStages)
    .where(and(eq(funnelStages.id, parsed.data.stageId), eq(funnelStages.tenantId, auth.tenant.id)))
    .limit(1);
  if (!stage) return apiError(404, 'Stage not found');

  const now = new Date();
  // Upsert: one row per client (uniqueIndex on clientId).
  const [existing] = await db
    .select({ id: clientFunnel.id })
    .from(clientFunnel)
    .where(eq(clientFunnel.clientId, parsed.data.clientId))
    .limit(1);

  let row;
  if (existing) {
    [row] = await db
      .update(clientFunnel)
      .set({ stageId: parsed.data.stageId, movedAt: now, movedBy: auth.user.id })
      .where(eq(clientFunnel.id, existing.id))
      .returning();
  } else {
    [row] = await db
      .insert(clientFunnel)
      .values({
        clientId: parsed.data.clientId,
        stageId: parsed.data.stageId,
        movedAt: now,
        movedBy: auth.user.id,
      })
      .returning();
  }

  return apiSuccess(row);
}
