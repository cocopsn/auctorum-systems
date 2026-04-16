export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db, subscriptions, userDashboardPreferences } from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'

export async function GET() {
  try {
    const auth = await getAuthTenant()
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.tenantId, auth.tenant.id))
      .limit(1)

    const [preferences] = await db
      .select()
      .from(userDashboardPreferences)
      .where(and(
        eq(userDashboardPreferences.userId, auth.user.id),
        eq(userDashboardPreferences.tenantId, auth.tenant.id),
      ))
      .limit(1)

    return NextResponse.json({
      tenant: {
        id: auth.tenant.id,
        name: auth.tenant.name,
        type: auth.tenant.tenantType,
        plan: auth.tenant.plan,
      },
      user: {
        id: auth.user.id,
        name: auth.user.name || auth.tenant.name,
      },
      subscription,
      preferences: preferences || {
        hiddenWidgets: [],
        widgetOrder: [],
        defaultLandingModule: null,
      },
    })
  } catch (error) {
    console.error('dashboard shell GET error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
