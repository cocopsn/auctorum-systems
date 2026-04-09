export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { and, asc, eq, sql } from 'drizzle-orm';
import { db, funnelStages, clientFunnel } from '@quote-engine/db';
import { getAuthTenant } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { validateOrigin } from '@/lib/csrf';

const DEFAULT_STAGES = [
  { name: 'Nuevo contacto', position: 0, color: '#94a3b8' },
  { name: 'Interesado', position: 1, color: '#3b82f6' },
  { name: 'Cita agendada', position: 2, color: '#f59e0b' },
  { name: 'Confirmada', position: 3, color: '#10b981' },
  { name: 'Atendido', position: 4, color: '#6366f1' },
];

const createSchema = z.object({
  name: z.string().min(1).max(100),
  position: z.number().int().min(0).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

const reorderSchema = z.object({
  stages: z.array(
    z.object({
      id: z.string().uuid(),
      position: z.number().int().min(0),
      name: z.string().min(1).max(100).optional(),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    }),
  ),
});

async function seedDefaults(tenantId: string) {
  await db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: funnelStages.id })
      .from(funnelStages)
      .where(eq(funnelStages.tenantId, tenantId))
      .limit(1);
    if (existing.length > 0) return;
    await tx.insert(funnelStages).values(
      DEFAULT_STAGES.map((s) => ({ tenantId, name: s.name, position: s.position, color: s.color })),
    );
  });
}

export async function GET() {
  const auth = await getAuthTenant();
  if (!auth) return apiError(401, 'Unauthorized');

  await seedDefaults(auth.tenant.id);

  const stages = await db
    .select()
    .from(funnelStages)
    .where(and(eq(funnelStages.tenantId, auth.tenant.id), eq(funnelStages.isActive, true)))
    .orderBy(asc(funnelStages.position));

  // Count clients per stage (only stages of this tenant).
  const counts = await db
    .select({
      stageId: clientFunnel.stageId,
      total: sql<number>`count(*)::int`,
    })
    .from(clientFunnel)
    .innerJoin(funnelStages, eq(clientFunnel.stageId, funnelStages.id))
    .where(eq(funnelStages.tenantId, auth.tenant.id))
    .groupBy(clientFunnel.stageId);

  const countMap = new Map(counts.map((c) => [c.stageId, c.total]));
  return apiSuccess(stages.map((s) => ({ ...s, clientCount: countMap.get(s.id) ?? 0 })));
}

export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) return apiError(403, 'Invalid origin');
  const auth = await getAuthTenant();
  if (!auth) return apiError(401, 'Unauthorized');

  const body = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(400, 'Invalid body', parsed.error.errors);

  const [created] = await db
    .insert(funnelStages)
    .values({
      tenantId: auth.tenant.id,
      name: parsed.data.name,
      position: parsed.data.position ?? 0,
      color: parsed.data.color ?? '#6366f1',
    })
    .returning();

  return apiSuccess(created, 201);
}

export async function PUT(request: NextRequest) {
  if (!validateOrigin(request)) return apiError(403, 'Invalid origin');
  const auth = await getAuthTenant();
  if (!auth) return apiError(401, 'Unauthorized');

  const body = await request.json().catch(() => ({}));
  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) return apiError(400, 'Invalid body', parsed.error.errors);

  await db.transaction(async (tx) => {
    for (const s of parsed.data.stages) {
      const set: Record<string, unknown> = { position: s.position };
      if (s.name !== undefined) set.name = s.name;
      if (s.color !== undefined) set.color = s.color;
      await tx
        .update(funnelStages)
        .set(set)
        .where(and(eq(funnelStages.id, s.id), eq(funnelStages.tenantId, auth.tenant.id)));
    }
  });

  return apiSuccess({ updated: parsed.data.stages.length });
}
