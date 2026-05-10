import { NextRequest, NextResponse } from 'next/server'
import { db, clientFunnel, funnelStages } from '@quote-engine/db'
import { eq, and } from 'drizzle-orm'
import { getAuthTenant } from '@/lib/auth'
import { z } from 'zod';
import { validateOrigin } from '@/lib/csrf'
import { validateClientBelongsToTenant, CrossTenantError } from '@/lib/tenant-validation'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest) {
  if (!validateOrigin(request)) return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });

  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const moveSchema = z.object({
      clientId: z.string().uuid(),
      stageId: z.string().uuid(),
    });
    const parsed = moveSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { clientId, stageId } = parsed.data;

    // Verify both FKs belong to this tenant. Pre-2026-05-10 only the
    // stage was checked — the clientId was inserted directly, so a
    // tenant could pollute their own funnel with another tenant's
    // client UUIDs.
    try {
      await validateClientBelongsToTenant(clientId, auth.tenant.id)
    } catch (err) {
      if (err instanceof CrossTenantError) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
      throw err
    }

    // Verify stage belongs to tenant
    const [stage] = await db
      .select()
      .from(funnelStages)
      .where(and(eq(funnelStages.id, stageId), eq(funnelStages.tenantId, auth.tenant.id)))
      .limit(1)

    if (!stage) {
      return NextResponse.json({ error: 'Etapa no encontrada' }, { status: 404 })
    }

    // Upsert client_funnel
    const existing = await db
      .select()
      .from(clientFunnel)
      .where(eq(clientFunnel.clientId, clientId))
      .limit(1)

    if (existing.length > 0) {
      await db
        .update(clientFunnel)
        .set({ stageId, movedAt: new Date(), movedBy: auth.user.id })
        .where(eq(clientFunnel.clientId, clientId))
    } else {
      await db.insert(clientFunnel).values({
        clientId,
        stageId,
        movedBy: auth.user.id,
      })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Funnel move error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
