export const dynamic = 'force-dynamic'

/**
 * GET /api/dashboard/patient-payments
 *
 * Lists patient payments for the current tenant + month-to-date KPIs.
 */
import { NextResponse } from 'next/server'
import { and, desc, eq, gte, sql } from 'drizzle-orm'
import { db, patientPayments } from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'

export async function GET() {
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  // KPIs (this month)
  const [kpis] = await db.execute(sql`
    SELECT
      COALESCE(SUM(CASE WHEN status = 'succeeded' THEN amount ELSE 0 END), 0)::int AS gross,
      COALESCE(SUM(CASE WHEN status = 'succeeded' THEN application_fee ELSE 0 END), 0)::int AS fees,
      COUNT(*) FILTER (WHERE status = 'succeeded') ::int AS count_succeeded,
      COUNT(*) FILTER (WHERE status = 'pending') ::int AS count_pending
    FROM patient_payments
    WHERE tenant_id = ${auth.tenant.id}
      AND created_at >= ${monthStart.toISOString()}
  `) as unknown as Array<{ gross: number; fees: number; count_succeeded: number; count_pending: number }>

  // Recent rows
  const rows = await db
    .select()
    .from(patientPayments)
    .where(eq(patientPayments.tenantId, auth.tenant.id))
    .orderBy(desc(patientPayments.createdAt))
    .limit(100)

  return NextResponse.json({
    kpis: {
      grossCentavos: kpis?.gross ?? 0,
      feesCentavos: kpis?.fees ?? 0,
      netCentavos: (kpis?.gross ?? 0) - (kpis?.fees ?? 0),
      countSucceeded: kpis?.count_succeeded ?? 0,
      countPending: kpis?.count_pending ?? 0,
    },
    payments: rows,
  })
}
