export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { and, between, eq, sql } from 'drizzle-orm'
import { db, appointments, patients, patientPayments } from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'

/**
 * GET /api/dashboard/reports?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Tenant summary KPIs for the medical practice over the date range:
 *   - appointments breakdown (total, completed, cancelled, no-show, completionRate)
 *   - new patient count
 *   - revenue from patient_payments (status=succeeded), in centavos MXN
 *
 * Defaults: from = first day of current month, to = today.
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

    const fromTs = new Date(from + 'T00:00:00Z')
    const toTs = new Date(to + 'T23:59:59Z')
    const tenantId = auth.tenant.id

    // Appointments aggregated by status
    const apptRows = await db
      .select({
        status: appointments.status,
        count: sql<number>`count(*)::int`,
      })
      .from(appointments)
      .where(and(eq(appointments.tenantId, tenantId), between(appointments.date, from, to)))
      .groupBy(appointments.status)

    let total = 0
    let completed = 0
    let cancelled = 0
    let noShow = 0
    let scheduled = 0
    let confirmed = 0
    for (const r of apptRows) {
      const c = Number(r.count)
      total += c
      switch (r.status) {
        case 'completed': completed = c; break
        case 'cancelled': cancelled = c; break
        case 'no_show':   noShow = c; break
        case 'scheduled': scheduled = c; break
        case 'confirmed': confirmed = c; break
      }
    }
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

    // New patients (timestamps)
    const [newPatientsRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(patients)
      .where(and(eq(patients.tenantId, tenantId), between(patients.createdAt, fromTs, toTs)))

    // Revenue from patient_payments (only succeeded), in centavos
    const [revenueRow] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${patientPayments.amount}), 0)::int`,
        fees:  sql<number>`COALESCE(SUM(${patientPayments.applicationFee}), 0)::int`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(patientPayments)
      .where(and(
        eq(patientPayments.tenantId, tenantId),
        eq(patientPayments.status, 'succeeded'),
        between(patientPayments.createdAt, fromTs, toTs),
      ))

    const days = Math.max(1, Math.round((toTs.getTime() - fromTs.getTime()) / 86400000))
    const totalCentavos = Number(revenueRow?.total ?? 0)

    return NextResponse.json({
      period: { from, to, days },
      appointments: {
        total,
        completed,
        cancelled,
        noShow,
        scheduled,
        confirmed,
        completionRate,
      },
      patients: {
        new: Number(newPatientsRow?.count ?? 0),
      },
      revenue: {
        total: totalCentavos,
        fees: Number(revenueRow?.fees ?? 0),
        net: totalCentavos - Number(revenueRow?.fees ?? 0),
        payments: Number(revenueRow?.count ?? 0),
        avgPerDay: Math.round(totalCentavos / days),
      },
    })
  } catch (err) {
    console.error('[GET /api/dashboard/reports] error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function isIsoDate(v: string | null): boolean {
  return !!v && /^\d{4}-\d{2}-\d{2}$/.test(v)
}
