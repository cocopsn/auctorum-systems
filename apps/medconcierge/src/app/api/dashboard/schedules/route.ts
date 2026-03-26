export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@quote-engine/db'
import { schedules, tenants } from '@quote-engine/db'

async function getTenantId() {
  const [tenant] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, 'dra-martinez'))
    .limit(1)
  return tenant?.id
}

export async function GET() {
  const tenantId = await getTenantId()
  if (!tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 401 })

  const result = await db
    .select()
    .from(schedules)
    .where(eq(schedules.tenantId, tenantId))
    .orderBy(schedules.dayOfWeek)

  return NextResponse.json({ schedules: result })
}

export async function PUT(request: NextRequest) {
  const tenantId = await getTenantId()
  if (!tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 401 })

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
