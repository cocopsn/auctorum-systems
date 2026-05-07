/**
 * Cron: weekly KPI summary delivered by WhatsApp every Monday 8:00 AM
 * (America/Monterrey).
 *
 *   • Cita counts (total, completed, cancelled, no-show)
 *   • Pacientes nuevos
 *   • Revenue cobrado (suma de patient_payments con status='paid')
 *   • Tasa de asistencia
 *
 * Filters: only tenants with provisioning_status='active', is_active=true,
 * deletedAt IS NULL, AND have a phone in `config.contact.whatsapp` or
 * `config.contact.phone`. Tenants can opt-out via
 * `tenant.config.notifications.weekly_report_enabled = false`.
 *
 * Run:      npx tsx scripts/cron-weekly-report.ts
 * Schedule: cron_restart '0 8 * * 1' (PM2)
 */

import 'dotenv/config'
import { db, tenants, appointments, patients, patientPayments } from '@quote-engine/db'
import type { TenantConfig } from '@quote-engine/db'
import { and, eq, gte, lte, isNull, sql } from 'drizzle-orm'
import { sendWhatsAppMessage } from '@quote-engine/notifications/whatsapp'

const TIMEZONE = 'America/Monterrey'

// ─── Date helpers (TZ-aware) ──────────────────────────────────────────────

/**
 * Returns Monday 00:00:00 of the previous calendar week in TIMEZONE.
 * Today is Monday 2026-05-04 → returns 2026-04-27 00:00.
 */
function getLastMondayLocal(now: Date): Date {
  const local = new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE }))
  const day = local.getDay() // 0=Sun..6=Sat
  // Days since the previous-week Monday: if today is Monday (1) → 7
  const offsetDays = day === 0 ? 13 : day + 6
  local.setDate(local.getDate() - offsetDays)
  local.setHours(0, 0, 0, 0)
  return local
}

function getLastSundayLocal(monday: Date): Date {
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return sunday
}

function fmtRange(from: Date, to: Date): string {
  const fmt = new Intl.DateTimeFormat('es-MX', {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: 'short',
  })
  return `${fmt.format(from)} – ${fmt.format(to)}`
}

function fmtDateOnly(d: Date): string {
  // YYYY-MM-DD in TZ (matches appointments.date which is a naïve local string)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

function fmtMXN(n: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

// ─── KPI queries (per-tenant, scoped to last week) ────────────────────────

type WeekRange = { fromDate: string; toDate: string; from: Date; to: Date }

async function appointmentStats(tenantId: string, week: WeekRange) {
  const rows = await db
    .select({
      status: appointments.status,
      n: sql<number>`count(*)::int`,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.tenantId, tenantId),
        gte(appointments.date, week.fromDate),
        lte(appointments.date, week.toDate),
      ),
    )
    .groupBy(appointments.status)

  let total = 0
  let completed = 0
  let cancelled = 0
  let noShow = 0
  for (const row of rows) {
    const n = Number(row.n) || 0
    total += n
    if (row.status === 'completed') completed += n
    else if (row.status === 'cancelled') cancelled += n
    else if (row.status === 'no_show') noShow += n
  }
  return { total, completed, cancelled, noShow }
}

async function newPatientsCount(tenantId: string, week: WeekRange): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(patients)
    .where(
      and(
        eq(patients.tenantId, tenantId),
        gte(patients.createdAt, week.from),
        lte(patients.createdAt, week.to),
      ),
    )
  return Number(row?.n) || 0
}

async function paidRevenue(tenantId: string, week: WeekRange): Promise<number> {
  const [row] = await db
    .select({ sum: sql<string>`coalesce(sum(amount), 0)` })
    .from(patientPayments)
    .where(
      and(
        eq(patientPayments.tenantId, tenantId),
        eq(patientPayments.status, 'paid'),
        gte(patientPayments.paidAt, week.from),
        lte(patientPayments.paidAt, week.to),
      ),
    )
  return parseFloat(row?.sum ?? '0')
}

// ─── Main ─────────────────────────────────────────────────────────────────

function buildMessage(args: {
  name: string
  range: string
  total: number
  completed: number
  cancelled: number
  noShow: number
  newPatients: number
  revenue: number
}): string {
  const attendance = args.total > 0 ? Math.round((args.completed / args.total) * 100) : 0
  return [
    `📊 *Reporte semanal — ${args.name}*`,
    `Semana ${args.range}`,
    '',
    `📅 Citas: ${args.total} (✓ ${args.completed} completadas · ✕ ${args.cancelled} canceladas · ⚠ ${args.noShow} no-show)`,
    `👥 Pacientes nuevos: ${args.newPatients}`,
    `💵 Ingresos cobrados: ${fmtMXN(args.revenue)}`,
    `📈 Tasa de asistencia: ${attendance}%`,
    '',
    `Detalle: https://med.auctorum.com.mx/reportes`,
    '',
    '— Auctorum Med',
  ].join('\n')
}

async function main() {
  const startedAt = Date.now()
  const now = new Date()
  const monday = getLastMondayLocal(now)
  const sunday = getLastSundayLocal(monday)
  const week: WeekRange = {
    from: monday,
    to: sunday,
    fromDate: fmtDateOnly(monday),
    toDate: fmtDateOnly(sunday),
  }
  const range = fmtRange(monday, sunday)

  // Pull active tenants
  const rows = await db
    .select({
      id: tenants.id,
      name: tenants.name,
      config: tenants.config,
    })
    .from(tenants)
    .where(
      and(
        eq(tenants.provisioningStatus, 'active'),
        eq(tenants.isActive, true),
        isNull(tenants.deletedAt),
      ),
    )

  let sent = 0
  let skipped = 0
  let failed = 0

  for (const t of rows) {
    const config = (t.config ?? {}) as TenantConfig
    const optedOut = (config.notifications as any)?.weekly_report_enabled === false
    if (optedOut) {
      skipped += 1
      continue
    }

    const phone =
      config.contact?.whatsapp?.toString().trim() ||
      config.contact?.phone?.toString().trim()
    if (!phone) {
      skipped += 1
      continue
    }

    try {
      const [stats, newPats, revenue] = await Promise.all([
        appointmentStats(t.id, week),
        newPatientsCount(t.id, week),
        paidRevenue(t.id, week),
      ])

      // Skip tenants with literally zero activity — sending an all-zero
      // report week after week becomes spam.
      if (stats.total === 0 && newPats === 0 && revenue === 0) {
        skipped += 1
        continue
      }

      const message = buildMessage({
        name: t.name,
        range,
        total: stats.total,
        completed: stats.completed,
        cancelled: stats.cancelled,
        noShow: stats.noShow,
        newPatients: newPats,
        revenue,
      })

      const ok = await sendWhatsAppMessage({ to: phone, message })
      if (ok) sent += 1
      else failed += 1
    } catch (err) {
      failed += 1
      console.error(
        '[weekly-report] tenant=' + t.id + ' error:',
        err instanceof Error ? err.message : err,
      )
    }
  }

  console.log(
    JSON.stringify({
      action: 'weekly_report_cycle',
      ms: Date.now() - startedAt,
      tenants_total: rows.length,
      sent,
      skipped,
      failed,
      week_from: week.fromDate,
      week_to: week.toDate,
      timestamp: new Date().toISOString(),
    }),
  )

  process.exit(failed > 0 && sent === 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('[weekly-report] fatal:', err)
  process.exit(1)
})
