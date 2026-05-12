import { NextRequest, NextResponse } from 'next/server'
import { db, quotes } from '@quote-engine/db'
import { and, eq, gte, lte, sql } from 'drizzle-orm'
import { getAuthTenant } from '@/lib/auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const dateRegex = /^\d{4}-\d{2}-\d{2}$/

const reportsQuerySchema = z.object({
  startDate: z.string().regex(dateRegex, 'startDate debe ser YYYY-MM-DD').optional(),
  endDate: z.string().regex(dateRegex, 'endDate debe ser YYYY-MM-DD').optional(),
})

// GET /api/dashboard/reports
//
// Pre-2026-05-11 this endpoint computed `totalQuotes / totalValue /
// avgTicket / quotesByStatus` by summing the in-memory page of rows
// AFTER applying LIMIT 200 / OFFSET. Any tenant with more than 200
// quotes in the date range saw KPI numbers that were silently capped
// to the page window — "Total: $48,000 (2 cotizaciones)" when the
// real number was tens of thousands.
//
// The fix: KPIs are now a single aggregate query (`SELECT COUNT, SUM,
// AVG, status, COUNT GROUP BY status`) with NO limit. The endpoint
// no longer returns paginated rows at all — list views have their own
// endpoint (/api/dashboard/quotes). One endpoint, one job.
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const queryObj: Record<string, string> = {}
    if (searchParams.get('startDate')) queryObj.startDate = searchParams.get('startDate')!
    if (searchParams.get('endDate')) queryObj.endDate = searchParams.get('endDate')!

    const parsed = reportsQuerySchema.safeParse(queryObj)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Parametros invalidos', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const startDate =
      parsed.data.startDate ||
      new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
    const endDate =
      parsed.data.endDate || new Date().toISOString().split('T')[0]

    const conditions = and(
      eq(quotes.tenantId, auth.tenant.id),
      gte(quotes.createdAt, new Date(startDate)),
      lte(quotes.createdAt, new Date(endDate + 'T23:59:59Z')),
    )

    // KPI aggregate — runs across ALL rows in the range, no limit.
    const [kpis] = await db
      .select({
        totalQuotes: sql<number>`COUNT(*)::int`,
        totalValue: sql<number>`COALESCE(SUM(${quotes.total}), 0)::float`,
        avgTicket: sql<number>`COALESCE(AVG(${quotes.total}), 0)::float`,
      })
      .from(quotes)
      .where(conditions)

    // Per-status counts (also no limit).
    const statusRows = await db
      .select({
        status: quotes.status,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(quotes)
      .where(conditions)
      .groupBy(quotes.status)

    const quotesByStatus: Record<string, number> = {}
    for (const r of statusRows) {
      const s = r.status || 'generated'
      quotesByStatus[s] = r.count
    }

    return NextResponse.json({
      totalQuotes: kpis?.totalQuotes ?? 0,
      totalValue: Math.round((kpis?.totalValue ?? 0) * 100) / 100,
      avgTicket: Math.round((kpis?.avgTicket ?? 0) * 100) / 100,
      quotesByStatus,
      startDate,
      endDate,
    })
  } catch (err) {
    console.error('Reports GET error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
