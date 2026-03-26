export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@quote-engine/db'
import { schedules } from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'

export async function GET() {
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenantId = auth.tenant.id

  const result = await db
    .select()
    .from(schedules)
    .where(eq(schedules.tenantId, tenantId))
    .orderBy(schedules.dayOfWeek)

  return NextResponse.json({ schedules: result })
}

export async function PUT(request: NextRequest) {
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenantId = auth.tenant.id

  try {
    const { schedules: newSchedules } = await request.json()

    if (!Array.isArray(newSchedules)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    // Delete existing and reinsert
    await db.delete(schedules).where(eq(schedules.tenantId, tenantId))

    if (newSchedules.length > 0) {
      await db.insert(schedules).values(
        newSchedules.map((s: { dayOfWeek: number; startTime: string; endTime: string; slotDurationMin: number; isActive: boolean; location: string }) => ({
          tenantId,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          slotDurationMin: s.slotDurationMin ?? 30,
          isActive: s.isActive ?? true,
          location: s.location ?? null,
        }))
      )
    }

    const result = await db
      .select()
      .from(schedules)
      .where(eq(schedules.tenantId, tenantId))
      .orderBy(schedules.dayOfWeek)

    return NextResponse.json({ schedules: result })
  } catch (error) {
    console.error('Schedule update error:', error)
    return NextResponse.json({ error: 'Error updating schedules' }, { status: 500 })
  }
}
