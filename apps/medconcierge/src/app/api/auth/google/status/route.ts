export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getAuthTenant } from '@/lib/auth'

// GET /api/auth/google/status — Check Google Calendar OAuth connection status
export async function GET() {
  try {
    const auth = await getAuthTenant()
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const config = (auth.tenant.config as Record<string, any>) || {}
    const gc = config.googleCalendar
    const oauth = gc?.oauth

    if (gc?.mode === 'oauth' && oauth?.refreshToken) {
      return NextResponse.json({
        connected: true,
        mode: 'oauth',
        email: oauth.email || null,
        calendarId: oauth.calendarId || gc.calendarId || null,
        connectedAt: oauth.connectedAt || null,
        autoSync: gc.autoSync ?? false,
      })
    }

    // Check if service account is configured (legacy)
    if (gc?.serviceAccountEmail && gc?.serviceAccountPrivateKey) {
      return NextResponse.json({
        connected: true,
        mode: 'service_account',
        email: gc.serviceAccountEmail,
        calendarId: gc.calendarId || null,
        connectedAt: gc.connectedAt || null,
        autoSync: gc.autoSync ?? false,
      })
    }

    return NextResponse.json({
      connected: false,
      mode: null,
      email: null,
      calendarId: null,
      connectedAt: null,
      autoSync: false,
    })
  } catch (err: any) {
    console.error('[google-oauth] Status error:', err?.message || err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
