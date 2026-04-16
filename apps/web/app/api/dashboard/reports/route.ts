import { NextRequest, NextResponse } from 'next/server'
import { db, quotes } from '@quote-engine/db'
import { eq, and, gte, lte, sql, count, desc } from 'drizzle-orm'
import { getAuthTenant } from '@/lib/auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const dateRegex = /^\d{4}-\d{2}-\d{2}$/

const reportsQuerySchema = z.object({
  startDate: z.string().regex(dateRegex, 'startDate debe ser YYYY-MM-DD').optional(),
  endDate: z.string().regex(dateRegex, 'endDate debe ser YYYY-MM-DD').optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(500).optional().default(200),
})

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const queryObj: Record<string, string> = {}
    if (searchParams.get('startDate')) queryObj.startDate = searchParams.get('startDate')!
    if (searchParams.get('endDate')) queryObj.endDate = searchParams.get('endDate')!
    if (searchParams.get('page')) queryObj.page = searchParams.get('page')!
    if (searchParams.get('limit')) queryObj.limit = searchParams.get('limit')!

    const parsed = reportsQuerySchema.safeParse(queryObj)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Parametros invalidos', details: parsed.error.flatten() }, { status: 400 })
    }

    const startDate = parsed.data.startDate || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
    const endDate = parsed.data.endDate || new Date().toISOString().split('T')[0]
    const page = parsed.data.page
    const limit = parsed.data.limit
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
