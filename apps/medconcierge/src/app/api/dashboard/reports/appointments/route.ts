export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'

/**
 * GET /api/dashboard/reports/appointments?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Three breakdowns of appointments in the date range:
 *   - byStatus  : { status, count }[]
 *   - byDoctor  : { doctor, count }[] ("(sin asignar)" for null doctor_id)
 *   - byWeekday : { weekday: 0..6, count }[]  (0=Sunday, 6=Saturday)
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

    const [statusQ, doctorQ, weekdayQ] = await Promise.all([
      db.execute(sql`
        SELECT status, COUNT(*)::int AS count
        FROM appointments
        WHERE tenant_id = ${tenantId}
          AND date BETWEEN ${from} AND ${to}
        GROUP BY status
        ORDER BY count DESC
      `),
      db.execute(sql`
        SELECT COALESCE(d.name, '(sin asignar)') AS doctor, COUNT(*)::int AS count
        FROM appointments a
        LEFT JOIN doctors d ON a.doctor_id = d.id
        WHERE a.tenant_id = ${tenantId}
          AND a.date BETWEEN ${from} AND ${to}
        GROUP BY d.name
        ORDER BY count DESC
      `),
      db.execute(sql`
        SELECT EXTRACT(DOW FROM date::date)::int AS weekday, COUNT(*)::int AS count
        FROM appointments
        WHERE tenant_id = ${tenantId}
          AND date BETWEEN ${from} AND ${to}
        GROUP BY weekday
        ORDER BY weekday
      `),
    ])

    return NextResponse.json({
      period: { from, to },
      byStatus:  (statusQ as { rows?: unknown[] }).rows  ?? statusQ,
      byDoctor:  (doctorQ as { rows?: unknown[] }).rows  ?? doctorQ,
      byWeekday: (weekdayQ as { rows?: unknown[] }).rows ?? weekdayQ,
    })
  } catch (err) {
    console.error('[GET /api/dashboard/reports/appointments] error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function isIsoDate(v: string | null): boolean {
  return !!v && /^\d{4}-\d{2}-\d{2}$/.test(v)
}
