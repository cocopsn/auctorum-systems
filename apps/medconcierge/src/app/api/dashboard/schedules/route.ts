export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@quote-engine/db'
import { schedules } from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'
import { z } from 'zod';
import { validateOrigin } from '@/lib/csrf'

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
  if (!validateOrigin(request)) return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });

  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenantId = auth.tenant.id

  try {
    const bodySchema = z.object({
      schedules: z.array(z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        startTime: z.string(),
        endTime: z.string(),
        slotDurationMin: z.number().int().min(5).max(120).default(30),
        isActive: z.boolean().default(true),
        location: z.string().max(255).nullable().default(null),
      })),
    });
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { schedules: newSchedules } = parsed.data;

    // Soft-replace instead of hard delete + reinsert. Pre-2026-05-10 this
    // route ran `db.delete()` against tenant business data on every save,
    // breaking CLAUDE.md's "no DELETE on business data" rule and wiping
    // schedule history that other features (eg. schedule_blocks audit,
    // analytics on shift changes) might want to inspect later.
    //
    // New approach: deactivate every existing row, then upsert each
    // requested row to (tenant_id, day_of_week, start_time) which is
    // already a unique index. Old rows for days that aren't in the new
    // payload simply stay deactivated; rows that ARE in the payload come
    // back active with their fresh end_time / slot_duration / location.
    await db
      .update(schedules)
      .set({ isActive: false })
      .where(eq(schedules.tenantId, tenantId))

    for (const s of newSchedules) {
      await db
        .insert(schedules)
        .values({
          tenantId,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          slotDurationMin: s.slotDurationMin ?? 30,
          isActive: s.isActive ?? true,
          location: s.location ?? null,
        })
        .onConflictDoUpdate({
          target: [schedules.tenantId, schedules.dayOfWeek, schedules.startTime],
          set: {
            endTime: s.endTime,
            slotDurationMin: s.slotDurationMin ?? 30,
            isActive: s.isActive ?? true,
            location: s.location ?? null,
          },
        })
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
