import { NextRequest, NextResponse } from 'next/server'
import { db, funnelStages, clientFunnel, clients } from '@quote-engine/db'
import { eq, asc, sql, and } from 'drizzle-orm'
import { getAuthTenant } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)

    // Pagination for clients within the funnel (FIX 7.2)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '50'))
    const offset = (page - 1) * limit

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
      .limit(limit)
      .offset(offset)

    const stagesWithCounts = stages.map(stage => ({
      ...stage,
      clientCount: clientsData.filter(c => c.stageId === stage.id).length,
    }))

    return NextResponse.json({ stages: stagesWithCounts, clients: clientsData, pagination: { page, limit, offset } })
  } catch (err: any) {
    console.error('Funnel GET error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}