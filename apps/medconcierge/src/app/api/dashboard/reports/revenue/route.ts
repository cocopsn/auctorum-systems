export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'

/**
 * GET /api/dashboard/reports/revenue?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Revenue grouped by day for charting. Returns one row per calendar day
 * inside the range, even if the day had zero payments (so the chart line
 * stays continuous). Amounts in centavos MXN.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const sp = req.nextUrl.searchParams
    const today = new Date().toISOString().split('T')[0]
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split('T')[0]
    const from = isIsoDate(sp.get('from')) ? sp.get('from')! : monthStart
    const to = isIsoDate(sp.get('to')) ? sp.get('to')! : today

    const tenantId = auth.tenant.id

    // generate_series gives one row per day in the range; LEFT JOIN payments
    // so days with zero revenue still appear with amount=0.
    const rows = await db.execute(sql`
      SELECT
        d::date::text AS date,
        COALESCE(SUM(p.amount), 0)::int AS amount,
        COALESCE(COUNT(p.id), 0)::int AS count
      FROM generate_series(${from}::date, ${to}::date, '1 day') AS d
      LEFT JOIN patient_payments p
        ON p.tenant_id = ${tenantId}
       AND p.status = 'succeeded'
       AND p.created_at::date = d::date
      GROUP BY d
      ORDER BY d
    `)

    return NextResponse.json({
      period: { from, to },
      data: (rows as { rows?: unknown[] }).rows ?? rows,
    })
  } catch (err) {
    console.error('[GET /api/dashboard/reports/revenue] error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function isIsoDate(v: string | null): boolean {
  return !!v && /^\d{4}-\d{2}-\d{2}$/.test(v)
}
