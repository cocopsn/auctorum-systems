export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthTenant } from '@/lib/auth'
import { db, tenants } from '@quote-engine/db'
import { eq } from 'drizzle-orm'
import { validateOrigin } from '@/lib/csrf'

// POST /api/auth/google/disconnect — Disconnect Google Calendar OAuth
export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 })
  }

  try {
    const auth = await getAuthTenant()
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const config = (auth.tenant.config as Record<string, any>) || {}
    const oauth = config.googleCalendar?.oauth

    // Revoke token at Google
    if (oauth?.accessToken) {
      try {
        await fetch(
          `https://oauth2.googleapis.com/revoke?token=${oauth.accessToken}`,
          { method: 'POST' },
        )
      } catch {
        // Non-critical — token may already be expired
      }
    }

    // Clear OAuth config but preserve any service account config
    if (config.googleCalendar) {
      delete config.googleCalendar.oauth
      delete config.googleCalendar.mode
      delete config.googleCalendar.autoSync
      delete config.googleCalendar.calendarId

      // If no service account either, remove the whole object
      if (!config.googleCalendar.serviceAccountEmail) {
        delete config.googleCalendar
      }
    }

    await db
      .update(tenants)
      .set({ config, updatedAt: new Date() })
      .where(eq(tenants.id, auth.tenant.id))

    console.log(`[google-oauth] Disconnected for tenant ${auth.tenant.slug}`)

    return NextResponse.json({ success: true, message: 'Google Calendar desconectado' })
  } catch (err: any) {
    console.error('[google-oauth] Disconnect error:', err?.message || err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
