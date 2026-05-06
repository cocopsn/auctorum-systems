export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db, schedules, appointments } from '@quote-engine/db'
import { authenticateApiKey, apiUnauthorized, apiForbidden, apiRateLimit } from '@/lib/api-auth'

/**
 * GET /api/v1/availability?date=YYYY-MM-DD&doctor_id=<uuid>
 *
 * Returns available time slots for the given date based on the tenant's
 * schedule configuration minus any already-booked (non-cancelled) appointments.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateApiKey(req)
    if (!auth) return apiUnauthorized()
    if (!auth.permissions.includes('read')) return apiForbidden('read')
    const rl = await apiRateLimit(auth.tenant.id, auth.tenant.plan)
    if (rl) return rl

    const sp = req.nextUrl.searchParams
    const date = sp.get('date')
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'date (YYYY-MM-DD) is required' }, { status: 400 })
    }
    const doctorId = sp.get('doctor_id')

    // Day of week: JS Date 0=Sunday..6=Saturday; schema uses 1=Monday..7=Sunday
    // Build the date carefully to avoid TZ shifts (parse Y-M-D in UTC noon).
    const [y, m, d] = date.split('-').map(Number)
    const jsDow = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay() // 0=Sun..6=Sat
    const dow = jsDow === 0 ? 7 : jsDow // 1=Mon..7=Sun

    const scheduleRows = await db
      .select()
      .from(schedules)
      .where(and(eq(schedules.tenantId, auth.tenant.id), eq(schedules.dayOfWeek, dow), eq(schedules.isActive, true)))

    if (scheduleRows.length === 0) {
      return NextResponse.json({
        data: { date, doctorId, slots: [] },
        meta: { reason: 'No schedule for this weekday' },
      })
    }

    const where = [eq(appointments.tenantId, auth.tenant.id), eq(appointments.date, date)]
    if (doctorId) where.push(eq(appointments.doctorId, doctorId))
    const booked = await db
      .select({ startTime: appointments.startTime, endTime: appointments.endTime, status: appointments.status })
      .from(appointments)
      .where(and(...where))

    const bookedSet = new Set(
      booked
        .filter((b) => b.status !== 'cancelled' && b.status !== 'no_show')
        .map((b) => normalizeTime(b.startTime)),
    )

    // Build slots from each active schedule
    const slots: Array<{ start: string; end: string; available: boolean }> = []
    for (const sch of scheduleRows) {
      const stepMin = sch.slotDurationMin ?? 30
      const start = toMinutes(sch.startTime)
      const end = toMinutes(sch.endTime)
      for (let t = start; t + stepMin <= end; t += stepMin) {
        const startStr = fromMinutes(t)
        const endStr = fromMinutes(t + stepMin)
        slots.push({ start: startStr, end: endStr, available: !bookedSet.has(startStr) })
      }
    }

    return NextResponse.json({
      data: { date, doctorId, slots },
      meta: { total: slots.length, available: slots.filter((s) => s.available).length },
    })
  } catch (err) {
    console.error('[GET /api/v1/availability] error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function normalizeTime(t: string): string {
  // Accept "HH:MM" or "HH:MM:SS" — return "HH:MM"
  return t.length >= 5 ? t.substring(0, 5) : t
}

function toMinutes(t: string): number {
  const [h, m] = normalizeTime(t).split(':').map(Number)
  return h * 60 + m
}

function fromMinutes(min: number): string {
  const h = Math.floor(min / 60) % 24
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
