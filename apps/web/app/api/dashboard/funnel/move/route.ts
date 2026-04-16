import { NextRequest, NextResponse } from 'next/server'
import { db, clientFunnel, funnelStages } from '@quote-engine/db'
import { eq, and } from 'drizzle-orm'
import { getAuthTenant } from '@/lib/auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const moveSchema = z.object({
  clientId: z.string().uuid('clientId debe ser UUID valido'),
  stageId: z.string().uuid('stageId debe ser UUID valido'),
})

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const parsed = moveSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos invalidos', details: parsed.error.flatten() }, { status: 400 })
    }

    const { clientId, stageId } = parsed.data

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
