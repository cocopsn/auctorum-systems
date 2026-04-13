export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { and, eq, gte, lte, notInArray } from 'drizzle-orm'
import { db } from '@quote-engine/db'
import { schedules, scheduleBlocks, appointments } from '@quote-engine/db'
import { rateLimit } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  // Rate limiting: 30 req/min per IP
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const { success: rateLimitOk } = rateLimit(`availability:${ip}`, 30, 60_000);
  if (!rateLimitOk) {
    return Response.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { searchParams } = request.nextUrl
  const tenantId = searchParams.get('tenantId')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  if (!tenantId || !startDate || !endDate) {
    return NextResponse.json(
      { error: 'Missing required params: tenantId, startDate, endDate' },
      { status: 400 }
    )
  }

  try {
    // Get active schedules for tenant
    const tenantSchedules = await db
      .select()
      .from(schedules)
      .where(and(eq(schedules.tenantId, tenantId), eq(schedules.isActive, true)))

    // Get blocks in date range
    const blocks = await db
      .select()
      .from(scheduleBlocks)
      .where(
        and(
          eq(scheduleBlocks.tenantId, tenantId),
          lte(scheduleBlocks.startDate, endDate),
          gte(scheduleBlocks.endDate, startDate)
        )
      )

    // Get existing non-cancelled appointments in date range
    const existingAppointments = await db
      .select({
        date: appointments.date,
        startTime: appointments.startTime,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.tenantId, tenantId),
          gte(appointments.date, startDate),
          lte(appointments.date, endDate),
          notInArray(appointments.status, ['cancelled', 'rescheduled'])
        )
      )

    // Build booked set for fast lookup
    const bookedSet = new Set(
      existingAppointments.map((a) => `${a.date}_${a.startTime}`)
    )

    // Build blocked date set
    const blockedDates = new Set<string>()
    for (const block of blocks) {
      const start = new Date(block.startDate)
      const end = new Date(block.endDate)
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        blockedDates.add(d.toISOString().split('T')[0])
      }
    }

    // Generate availability for each date in range
    const dates: Array<{
      date: string
      slots: Array<{ startTime: string; endTime: string; available: boolean }>
    }> = []

    const current = new Date(startDate)
    const end = new Date(endDate)

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0]
      const dayOfWeek = current.getDay()

      // Find all schedule blocks for this day (e.g. morning + afternoon)
      const daySchedules = tenantSchedules.filter((s) => s.dayOfWeek === dayOfWeek)

      if (daySchedules.length > 0 && !blockedDates.has(dateStr)) {
        const allSlots = daySchedules.flatMap((sched) =>
          generateSlots(
            sched.startTime,
            sched.endTime,
            sched.slotDurationMin ?? 30
          )
        )

        dates.push({
          date: dateStr,
          slots: allSlots.map((slot) => ({
            ...slot,
            available: !bookedSet.has(`${dateStr}_${slot.startTime}`),
          })),
        })
      }

      current.setDate(current.getDate() + 1)
    }

    return NextResponse.json({ dates })
  } catch (error) {
    console.error('Availability error:', error)
    return NextResponse.json(
      { error: 'Error fetching availability' },
      { status: 500 }
    )
  }
}

function generateSlots(
  startTime: string,
  endTime: string,
  durationMin: number
): Array<{ startTime: string; endTime: string }> {
  const slots: Array<{ startTime: string; endTime: string }> = []
  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)

  let currentMin = startH * 60 + startM
  const endMin = endH * 60 + endM

  while (currentMin + durationMin <= endMin) {
    const slotStart = `${String(Math.floor(currentMin / 60)).padStart(2, '0')}:${String(currentMin % 60).padStart(2, '0')}:00`
    const slotEndMin = currentMin + durationMin
    const slotEnd = `${String(Math.floor(slotEndMin / 60)).padStart(2, '0')}:${String(slotEndMin % 60).padStart(2, '0')}:00`

    slots.push({ startTime: slotStart, endTime: slotEnd })
    currentMin += durationMin
  }

  return slots
}
