export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@quote-engine/db'
import { schedules, tenants } from '@quote-engine/db'

// SEC-06 AUTH AUDIT: NO AUTHENTICATION IS ENFORCED on this dashboard route.
// getTenantId() is hardcoded to 'dra-martinez' instead of deriving tenant
// from an authenticated session. GET and PUT handlers are publicly accessible.
// The PUT handler allows anyone to delete and recreate all schedules.
// TODO: Replace getTenantId() with auth-based tenant resolution:
//   1. Verify the user's session (magic-link token or Supabase JWT)
//   2. Derive tenant_id from the authenticated user's record in the users table
//   3. Return 401 if no valid session exists
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
