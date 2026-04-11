import { NextRequest, NextResponse } from 'next/server'
import { db, quotes } from '@quote-engine/db'
import { eq, and, gte, lte, sql, count, desc } from 'drizzle-orm'
import { getAuthTenant } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0]

    // Mandatory pagination for the underlying quotes query (FIX 7.2)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(500, parseInt(searchParams.get('limit') || '200'))
    const offset = (page - 1) * limit

    const conditions = and(
      eq(quotes.tenantId, auth.tenant.id),
      gte(quotes.createdAt, new Date(startDate)),
      lte(quotes.createdAt, new Date(endDate + 'T23:59:59Z'))
    )

    // Use paginated query instead of loading all quotes into memory
    const allQuotes = await db
      .select()
      .from(quotes)
      .where(conditions)
      .orderBy(desc(quotes.createdAt))
      .limit(limit)
      .offset(offset)

    const totalQuotes = allQuotes.length
    const totalValue = allQuotes.reduce((sum, q) => sum + Number(q.total || 0), 0)
    const avgTicket = totalQuotes > 0 ? totalValue / totalQuotes : 0

    const quotesByStatus: Record<string, number> = {}
    for (const q of allQuotes) {
      const s = q.status || 'generated'
      quotesByStatus[s] = (quotesByStatus[s] || 0) + 1
    }

    return NextResponse.json({
      totalQuotes,
      totalValue: Math.round(totalValue * 100) / 100,
      avgTicket: Math.round(avgTicket * 100) / 100,
      quotesByStatus,
      startDate,
      endDate,
      pagination: { page, limit, offset },
    })
  } catch (err: any) {
    console.error('Reports GET error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}