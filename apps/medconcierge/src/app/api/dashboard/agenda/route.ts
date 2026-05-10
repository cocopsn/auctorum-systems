import { NextResponse } from 'next/server'
import { and, count, eq, gte, lte, sql } from 'drizzle-orm'
import { db, appointments, patients } from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'
import {
  isGoogleCalendarConfigured,
  listCalendarEvents,
} from '@/lib/google-calendar'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenant = auth.tenant
    const tenantConfig = tenant.config as Record<string, any>
    const today = new Date().toISOString().split('T')[0]
    const monthStart = new Date()
    monthStart.setDate(1)
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0)

    const todayAppointments = await db
      .select({
        id: appointments.id,
        patientName: patients.name,
        startTime: appointments.startTime,
        reason: appointments.reason,
        status: appointments.status,
        googleEventId: appointments.googleEventId,
      })
      .from(appointments)
      .innerJoin(patients, eq(appointments.patientId, patients.id))
      .where(and(eq(appointments.tenantId, tenant.id), eq(appointments.date, today)))
      .orderBy(appointments.startTime)
      .limit(20)

    const [activePatients] = await db
      .select({ count: count() })
      .from(patients)
      .where(eq(patients.tenantId, tenant.id))

    const [revenue] = await db
      .select({ total: sql<string>`COALESCE(SUM(${appointments.consultationFee}), 0)` })
      .from(appointments)
      .where(
        and(
          eq(appointments.tenantId, tenant.id),
          eq(appointments.status, 'completed'),
          gte(appointments.date, monthStart.toISOString().split('T')[0]),
          lte(appointments.date, monthEnd.toISOString().split('T')[0]),
        ),
      )

    const completed = todayAppointments.filter((a) => a.status === 'completed').length
    // Pre-2026-05-10 the empty-day fallback was a hardcoded 96% — a vanity
    // number shown on quiet days that didn't reflect reality. Returning
    // null lets the UI render "—" or hide the pill entirely on no-data
    // days instead of lying.
    const attendanceRate = todayAppointments.length
      ? Math.round((completed / todayAppointments.length) * 100)
      : null

    // Merge Google Calendar events if configured
    let calendarEvents: any[] = []
    const calendarConfigured = isGoogleCalendarConfigured(tenantConfig)
    if (calendarConfigured) {
      try {
        const todayStart = new Date(today + 'T00:00:00')
        const todayEnd = new Date(today + 'T23:59:59')
        calendarEvents = await listCalendarEvents(
          todayStart.toISOString(),
          todayEnd.toISOString(),
          tenantConfig,
        )
      } catch (e) {
        console.error('[agenda] failed to fetch calendar events:', e)
      }
    }

    return NextResponse.json({
      tenantName: tenant.name,
      todayAppointments,
      activePatients: activePatients?.count ?? 0,
      revenue: revenue?.total ?? '0',
      attendanceRate,
      calendarConfigured,
      calendarEvents,
    })
  } catch (err: any) {
    console.error('Agenda GET error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
