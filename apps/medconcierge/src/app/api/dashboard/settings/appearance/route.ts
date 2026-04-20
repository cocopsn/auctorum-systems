export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthTenant } from '@/lib/auth'
import { db, tenants } from '@quote-engine/db'
import { eq } from 'drizzle-orm'

export async function GET() {
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const config = (auth.tenant.config as Record<string, unknown>) || {}
  return NextResponse.json({
    theme: config.dashboardTheme || 'teal-default',
    sidebarItems: config.sidebarItems || null,
  })
}

export async function PATCH(req: NextRequest) {
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { theme, sidebarItems } = body

  const config = { ...((auth.tenant.config as Record<string, unknown>) || {}) }
  if (theme) config.dashboardTheme = theme
  if (sidebarItems) config.sidebarItems = sidebarItems

  await db
    .update(tenants)
    .set({ config })
    .where(eq(tenants.id, auth.tenant.id))

  return NextResponse.json({ ok: true })
}
