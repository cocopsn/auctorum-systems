import { NextResponse } from 'next/server'
import { db, funnelStages, clientFunnel, clients } from '@quote-engine/db'
import { eq, asc, sql, and } from 'drizzle-orm'
import { getAuthTenant } from '@/lib/auth'
import { z } from 'zod';

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const stages = await db
      .select()
      .from(funnelStages)
      .where(eq(funnelStages.tenantId, auth.tenant.id))
      .orderBy(asc(funnelStages.position))

    const clientsData = await db
      .select({
        id: clients.id,
        name: clients.name,
        phone: clients.phone,
        email: clients.email,
        company: clients.company,
        status: clients.status,
        totalQuotes: clients.totalQuotes,
        createdAt: clients.createdAt,
        stageId: clientFunnel.stageId,
      })
      .from(clients)
      .leftJoin(clientFunnel, eq(clients.id, clientFunnel.clientId))
      .where(eq(clients.tenantId, auth.tenant.id))

    const stagesWithCounts = stages.map(stage => ({
      ...stage,
      clientCount: clientsData.filter(c => c.stageId === stage.id).length,
    }))

    return NextResponse.json({ stages: stagesWithCounts, clients: clientsData })
  } catch (err: any) {
    console.error('Funnel GET error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
