import { NextResponse } from 'next/server'
import { db, quotes, quoteItems, quoteEvents, clients } from '@quote-engine/db'
import { eq, desc, sql, and, gte, inArray } from 'drizzle-orm'
import { getAuthTenant } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenantId = auth.tenant.id
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000)

    const [totals] = await db
      .select({
        count: sql<number>`count(*)::int`,
        total: sql<number>`coalesce(sum(total::numeric), 0)`,
      })
      .from(quotes)
      .where(and(eq(quotes.tenantId, tenantId), gte(quotes.createdAt, thirtyDaysAgo)))

    const [accepted] = await db
      .select({
        count: sql<number>`count(*)::int`,
        total: sql<number>`coalesce(sum(total::numeric), 0)`,
      })
      .from(quotes)
      .where(and(eq(quotes.tenantId, tenantId), eq(quotes.status, 'accepted'), gte(quotes.createdAt, thirtyDaysAgo)))

    const topProducts = await db
      .select({
        name: quoteItems.productName,
        count: sql<number>`sum(${quoteItems.quantity}::int)`,
        revenue: sql<number>`sum(${quoteItems.lineTotal}::numeric)`,
      })
      .from(quoteItems)
      .innerJoin(quotes, eq(quoteItems.quoteId, quotes.id))
      .where(eq(quotes.tenantId, tenantId))
      .groupBy(quoteItems.productName)
      .orderBy(sql`sum(${quoteItems.lineTotal}::numeric) DESC`)
      .limit(5)

    const topClients = await db
      .select({
        company: clients.company,
        quotes: clients.totalQuotes,
        revenue: clients.totalAcceptedAmount,
        rate: sql<number>`CASE WHEN total_quotes > 0 THEN round((total_accepted::numeric / total_quotes::numeric) * 100) ELSE 0 END`,
      })
      .from(clients)
      .where(eq(clients.tenantId, tenantId))
      .orderBy(desc(clients.totalQuotedAmount))
      .limit(5)

    const funnelRows = await db
      .select({
        eventType: quoteEvents.eventType,
        count: sql<number>`count(distinct ${quoteEvents.quoteId})::int`,
      })
      .from(quoteEvents)
      .innerJoin(quotes, eq(quoteEvents.quoteId, quotes.id))
      .where(and(
        eq(quoteEvents.tenantId, tenantId),
        gte(quotes.createdAt, thirtyDaysAgo),
        inArray(quoteEvents.eventType, ['sent', 'opened', 'accepted']),
      ))
      .groupBy(quoteEvents.eventType)

    const funnel = {
      sent: funnelRows.find(r => r.eventType === 'sent')?.count ?? 0,
      opened: funnelRows.find(r => r.eventType === 'opened')?.count ?? 0,
      accepted: funnelRows.find(r => r.eventType === 'accepted')?.count ?? 0,
    }

    const conversionRate = totals.count > 0 ? Math.round((accepted.count / totals.count) * 100) : 0
    const avgQuoteValue = totals.count > 0 ? totals.total / totals.count : 0

    return NextResponse.json({
      tenantName: auth.tenant.name,
      totalQuotes: totals.count,
      acceptedCount: accepted.count,
      totalRevenue: accepted.total,
      conversionRate,
      avgQuoteValue,
      topProducts,
      topClients,
      funnel,
    })
  } catch (err: any) {
    console.error('Analytics GET error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
