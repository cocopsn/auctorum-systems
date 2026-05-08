export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'

/**
 * GET /api/dashboard/stats
 *
 * Single fan-out endpoint for the editorial dashboard. Pulls KPIs (with
 * 7-day sparkline series + day-over-day / month-over-month trends),
 * today's appointments timeline, week chart breakdown, recent activity
 * feed, and bot health snapshot — all in parallel.
 */
export async function GET() {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const tenantId = auth.tenant.id
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0]
    const sevenDaysAgo = new Date(Date.now() - 6 * 86_400_000).toISOString().split('T')[0]
    const startOfMonth = today.substring(0, 7) + '-01'
    const lastMonthStart = previousMonthStart(today)
    const lastMonthEnd = previousMonthEnd(today)
    const startOfWeek = mondayOf(today)
    const endOfWeek = sundayOf(today)

    const [
      todayCountQ,
      yesterdayCountQ,
      patientsQ,
      patientsLastMonthQ,
      attendanceQ,
      attendanceLastMonthQ,
      monthRevenueQ,
      lastMonthRevenueQ,
      apptSparkQ,
      revenueSparkQ,
      patientsSparkQ,
      todayListQ,
      weekQ,
      activityQ,
      botInstanceQ,
      botProcessedTodayQ,
    ] = await Promise.all([
      db.execute(sql`SELECT COUNT(*)::int AS n FROM appointments WHERE tenant_id = ${tenantId}::uuid AND date = ${today}`),
      db.execute(sql`SELECT COUNT(*)::int AS n FROM appointments WHERE tenant_id = ${tenantId}::uuid AND date = ${yesterday}`),
      db.execute(sql`SELECT COUNT(*)::int AS n FROM patients WHERE tenant_id = ${tenantId}::uuid`),
      db.execute(sql`SELECT COUNT(*)::int AS n FROM patients WHERE tenant_id = ${tenantId}::uuid AND created_at < ${startOfMonth}::date`),
      // Attendance = completed / (completed + no_show + cancelled) over the last 30 days
      db.execute(sql`
        SELECT
          COUNT(*) FILTER (WHERE status = 'completed')::int AS done,
          COUNT(*) FILTER (WHERE status IN ('completed','no_show','cancelled'))::int AS finalized
        FROM appointments
        WHERE tenant_id = ${tenantId}::uuid
          AND date >= (CURRENT_DATE - INTERVAL '30 days')
      `),
      db.execute(sql`
        SELECT
          COUNT(*) FILTER (WHERE status = 'completed')::int AS done,
          COUNT(*) FILTER (WHERE status IN ('completed','no_show','cancelled'))::int AS finalized
        FROM appointments
        WHERE tenant_id = ${tenantId}::uuid
          AND date >= (CURRENT_DATE - INTERVAL '60 days')
          AND date <  (CURRENT_DATE - INTERVAL '30 days')
      `),
      db.execute(sql`
        SELECT COALESCE(SUM(amount), 0)::bigint AS total
        FROM patient_payments
        WHERE tenant_id = ${tenantId}::uuid AND status = 'succeeded'
          AND created_at >= ${startOfMonth}::date
      `),
      db.execute(sql`
        SELECT COALESCE(SUM(amount), 0)::bigint AS total
        FROM patient_payments
        WHERE tenant_id = ${tenantId}::uuid AND status = 'succeeded'
          AND created_at >= ${lastMonthStart}::date AND created_at <= ${lastMonthEnd}::date
      `),
      // Sparkline: last 7 days, one row per day even when zero (LEFT JOIN generate_series)
      db.execute(sql`
        SELECT d::date::text AS date, COALESCE(COUNT(a.id), 0)::int AS n
        FROM generate_series(${sevenDaysAgo}::date, ${today}::date, '1 day') d
        LEFT JOIN appointments a ON a.tenant_id = ${tenantId}::uuid AND a.date = d::date
        GROUP BY d ORDER BY d
      `),
      db.execute(sql`
        SELECT d::date::text AS date, COALESCE(SUM(p.amount), 0)::bigint AS total
        FROM generate_series(${sevenDaysAgo}::date, ${today}::date, '1 day') d
        LEFT JOIN patient_payments p ON p.tenant_id = ${tenantId}::uuid
          AND p.status = 'succeeded' AND p.created_at::date = d::date
        GROUP BY d ORDER BY d
      `),
      db.execute(sql`
        SELECT d::date::text AS date, COALESCE(COUNT(p.id), 0)::int AS n
        FROM generate_series(${sevenDaysAgo}::date, ${today}::date, '1 day') d
        LEFT JOIN patients p ON p.tenant_id = ${tenantId}::uuid AND p.created_at::date = d::date
        GROUP BY d ORDER BY d
      `),
      db.execute(sql`
        SELECT a.id, a.start_time, a.end_time, a.status, a.reason,
               p.id AS patient_id, p.name AS patient_name, p.phone AS patient_phone,
               a.consultation_fee
        FROM appointments a
        INNER JOIN patients p ON a.patient_id = p.id
        WHERE a.tenant_id = ${tenantId}::uuid AND a.date = ${today}
        ORDER BY a.start_time ASC
      `),
      db.execute(sql`
        SELECT date::text AS date, status, COUNT(*)::int AS n
        FROM appointments
        WHERE tenant_id = ${tenantId}::uuid AND date >= ${startOfWeek}::date AND date <= ${endOfWeek}::date
        GROUP BY date, status
      `),
      // Activity feed — last 8 events: appointments created + messages received
      db.execute(sql`
        WITH appt AS (
          SELECT 'appointment'::text AS type, a.id::text AS id,
                 COALESCE(p.name, 'Paciente') AS title,
                 'Agendada para ' || a.date::text AS subtitle,
                 a.created_at AS at
          FROM appointments a
          LEFT JOIN patients p ON p.id = a.patient_id
          WHERE a.tenant_id = ${tenantId}::uuid
          ORDER BY a.created_at DESC LIMIT 6
        ),
        pay AS (
          SELECT 'payment'::text AS type, id::text AS id,
                 COALESCE(patient_name, 'Pago') AS title,
                 description AS subtitle,
                 created_at AS at
          FROM patient_payments
          WHERE tenant_id = ${tenantId}::uuid AND status = 'succeeded'
          ORDER BY created_at DESC LIMIT 4
        ),
        pat AS (
          SELECT 'patient'::text AS type, id::text AS id,
                 name AS title,
                 'Nuevo paciente' AS subtitle,
                 created_at AS at
          FROM patients
          WHERE tenant_id = ${tenantId}::uuid
          ORDER BY created_at DESC LIMIT 4
        )
        SELECT * FROM appt
        UNION ALL SELECT * FROM pay
        UNION ALL SELECT * FROM pat
        ORDER BY at DESC
        LIMIT 10
      `),
      // bot_instances has: id, tenant_id, channel, provider, external_bot_id,
      // external_phone_number_id, status, config (jsonb), created_at, updated_at.
      // We use updated_at as a heartbeat proxy — the worker bumps it when it
      // touches the row. There's no explicit last_seen_at column.
      db.execute(sql`
        SELECT id, status, updated_at, (config ? 'verify_token') AS has_verify
        FROM bot_instances
        WHERE tenant_id = ${tenantId}::uuid
        ORDER BY created_at DESC LIMIT 1
      `),
      db.execute(sql`
        SELECT COUNT(*)::int AS n
        FROM messages m
        INNER JOIN conversations c ON c.id = m.conversation_id
        WHERE c.tenant_id = ${tenantId}::uuid AND m.created_at::date = CURRENT_DATE
      `),
    ])

    const todayCount = first(todayCountQ).n ?? 0
    const yesterdayCount = first(yesterdayCountQ).n ?? 0
    const patientsTotal = first(patientsQ).n ?? 0
    const patientsLastMonth = first(patientsLastMonthQ).n ?? 0
    const a30 = first(attendanceQ)
    const a60 = first(attendanceLastMonthQ)
    const attendanceRate = a30.finalized > 0 ? Math.round((a30.done / a30.finalized) * 100) : 0
    const attendanceRateLast = a60.finalized > 0 ? Math.round((a60.done / a60.finalized) * 100) : 0
    const monthRevenueCentavos = Number(first(monthRevenueQ).total ?? 0)
    const lastMonthRevenueCentavos = Number(first(lastMonthRevenueQ).total ?? 0)
    const revenueTrendPct =
      lastMonthRevenueCentavos > 0
        ? Math.round(((monthRevenueCentavos - lastMonthRevenueCentavos) / lastMonthRevenueCentavos) * 100)
        : monthRevenueCentavos > 0 ? 100 : 0

    return NextResponse.json({
      greeting: greetingFor(new Date()),
      tenantName: auth.tenant.name,
      kpis: {
        citasHoy: {
          label: 'Citas hoy',
          value: todayCount,
          delta: todayCount - yesterdayCount,
          deltaLabel: 'vs ayer',
          spark: rowsAsSeries(apptSparkQ, 'n'),
        },
        pacientes: {
          label: 'Pacientes',
          value: patientsTotal,
          delta: patientsTotal - patientsLastMonth,
          deltaLabel: 'este mes',
          spark: rowsAsSeries(patientsSparkQ, 'n'),
        },
        asistencia: {
          label: 'Asistencia',
          value: attendanceRate,
          unit: '%',
          delta: attendanceRate - attendanceRateLast,
          deltaLabel: 'vs 30d ant.',
          // No sparkline for attendance (would mislead; needs longer window)
          spark: [],
        },
        revenue: {
          label: 'Revenue mes',
          value: monthRevenueCentavos,
          unit: 'centavos',
          delta: revenueTrendPct,
          deltaLabel: '% vs mes ant.',
          spark: rowsAsSeries(revenueSparkQ, 'total'),
        },
      },
      today: {
        date: today,
        appointments: rowsAsArray(todayListQ).map((r) => ({
          id: r.id,
          patientId: r.patient_id,
          patientName: r.patient_name ?? '(sin nombre)',
          patientPhone: r.patient_phone ?? '',
          startTime: r.start_time,
          endTime: r.end_time,
          status: r.status,
          reason: r.reason,
          fee: r.consultation_fee,
        })),
      },
      week: {
        from: startOfWeek,
        to: endOfWeek,
        rows: rowsAsArray(weekQ).map((r) => ({ date: r.date, status: r.status, count: r.n })),
      },
      activity: rowsAsArray(activityQ).map((r) => ({
        type: r.type as 'appointment' | 'payment' | 'patient',
        id: r.id,
        title: r.title,
        subtitle: r.subtitle,
        at: r.at,
      })),
      bot: (() => {
        const row = rowsAsArray(botInstanceQ)[0]
        const processed = first(botProcessedTodayQ).n ?? 0
        if (!row) {
          return { online: false, status: 'no_bot', processedToday: processed, lastSeenAt: null }
        }
        // online ≡ status === 'live' AND updated within the last 30 minutes
        // (updated_at acts as a soft heartbeat — bumped on every config save
        //  + every webhook touch; not a perfect "last message" timestamp).
        const lastSeen = row.updated_at ? new Date(row.updated_at) : null
        const fresh = lastSeen ? Date.now() - lastSeen.getTime() < 1000 * 60 * 30 : false
        const isOnline = row.status === 'live' && fresh
        return {
          online: isOnline,
          status: row.status ?? 'unknown',
          processedToday: processed,
          lastSeenAt: row.updated_at ?? null,
        }
      })(),
    })
  } catch (err) {
    console.error('[GET /api/dashboard/stats] error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/* ----------------------- helpers ----------------------- */

function first(q: unknown): any {
  const r = rowsAsArray(q)
  return r[0] ?? {}
}

function rowsAsArray(q: unknown): any[] {
  if (Array.isArray(q)) return q
  if (q && typeof q === 'object' && 'rows' in (q as object)) {
    return ((q as { rows: any[] }).rows) ?? []
  }
  return []
}

function rowsAsSeries(q: unknown, key: string): number[] {
  return rowsAsArray(q).map((r) => Number(r[key] ?? 0))
}

function greetingFor(d: Date): string {
  const h = d.getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function previousMonthStart(today: string): string {
  const d = new Date(today + 'T00:00:00Z')
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth() // 0-indexed; previous month is m-1 (handles Jan→Dec rollover)
  const prev = new Date(Date.UTC(y, m - 1, 1))
  return prev.toISOString().split('T')[0]
}
function previousMonthEnd(today: string): string {
  const d = new Date(today + 'T00:00:00Z')
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 0))
  return last.toISOString().split('T')[0]
}

function mondayOf(today: string): string {
  const d = new Date(today + 'T00:00:00Z')
  const day = d.getUTCDay() // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().split('T')[0]
}
function sundayOf(today: string): string {
  const d = new Date(mondayOf(today) + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + 6)
  return d.toISOString().split('T')[0]
}
