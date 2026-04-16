export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db, userDashboardPreferences } from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'
import { z } from 'zod'

const bodySchema = z.object({
  hiddenWidgets: z.array(z.string()).optional(),
  widgetOrder: z.array(z.string()).optional(),
  defaultLandingModule: z.string().nullable().optional(),
})

export async function GET() {
  try {
    const auth = await getAuthTenant()
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const [preferences] = await db
      .select()
      .from(userDashboardPreferences)
      .where(and(
        eq(userDashboardPreferences.userId, auth.user.id),
        eq(userDashboardPreferences.tenantId, auth.tenant.id),
      ))
      .limit(1)

    return NextResponse.json({
      preferences: preferences || {
        hiddenWidgets: [],
        widgetOrder: [],
        defaultLandingModule: null,
      },
    })
  } catch (error) {
    console.error('dashboard preferences GET error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthTenant()
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json({ error: 'Payload invalido' }, { status: 400 })
    }

    const values = {
      tenantId: auth.tenant.id,
      userId: auth.user.id,
      hiddenWidgets: parsed.data.hiddenWidgets || [],
      widgetOrder: parsed.data.widgetOrder || [],
      defaultLandingModule: parsed.data.defaultLandingModule || null,
      updatedAt: new Date(),
    }

    const [existing] = await db
      .select({ id: userDashboardPreferences.id })
      .from(userDashboardPreferences)
      .where(and(
        eq(userDashboardPreferences.userId, auth.user.id),
        eq(userDashboardPreferences.tenantId, auth.tenant.id),
      ))
      .limit(1)

    if (existing) {
      await db
        .update(userDashboardPreferences)
        .set(values)
        .where(eq(userDashboardPreferences.id, existing.id))
    } else {
      await db.insert(userDashboardPreferences).values(values)
    }

    return NextResponse.json({ ok: true, preferences: values })
  } catch (error) {
    console.error('dashboard preferences PUT error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
