import { NextRequest, NextResponse } from 'next/server'
import { db, clientFunnel, funnelStages } from '@quote-engine/db'
import { eq, and } from 'drizzle-orm'
import { getAuthTenant } from '@/lib/auth'
import { z } from 'zod';

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest) {
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

    if (false) {
      return NextResponse.json({ error: 'clientId y stageId son requeridos' }, { status: 400 })
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
