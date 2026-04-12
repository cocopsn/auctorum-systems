import { NextRequest, NextResponse } from 'next/server'
import { db, quotes } from '@quote-engine/db'
import { eq, and, gte, lte, sql, count } from 'drizzle-orm'
import { getAuthTenant } from '@/lib/auth'
import { z } from 'zod';

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0]

    const conditions = and(
      eq(quotes.tenantId, auth.tenant.id),
      gte(quotes.createdAt, new Date(startDate)),
      lte(quotes.createdAt, new Date(endDate + 'T23:59:59Z'))
    )

    const allQuotes = await db.select().from(quotes).where(conditions)

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
    })
  } catch (err: any) {
    console.error('Reports GET error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
