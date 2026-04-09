export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';
import { db, funnelStages, clientFunnel } from '@quote-engine/db';
import { getAuthTenant } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { validateOrigin } from '@/lib/csrf';

export async function DELETE(request: NextRequest, { params }: { params: { stageId: string } }) {
  if (!validateOrigin(request)) return apiError(403, 'Invalid origin');
  const auth = await getAuthTenant();
  if (!auth) return apiError(401, 'Unauthorized');

  const [stage] = await db
    .select({ id: funnelStages.id })
    .from(funnelStages)
    .where(and(eq(funnelStages.id, params.stageId), eq(funnelStages.tenantId, auth.tenant.id)))
    .limit(1);
  if (!stage) return apiError(404, 'Stage not found');

  const [{ count: clientsInStage = 0 } = { count: 0 }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(clientFunnel)
    .where(eq(clientFunnel.stageId, params.stageId));

  if (clientsInStage > 0) {
    return apiError(409, 'No se puede eliminar una etapa con clientes asignados', { clientsInStage });
  }

  await db
    .delete(funnelStages)
    .where(and(eq(funnelStages.id, params.stageId), eq(funnelStages.tenantId, auth.tenant.id)));

  return apiSuccess({ id: params.stageId, deleted: true });
}
