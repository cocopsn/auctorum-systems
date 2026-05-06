export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getAuthTenant } from '@/lib/auth'
import { ADDON_PACKAGES, getUsageSnapshot } from '@quote-engine/ai'

/**
 * GET /api/dashboard/usage
 *
 * Returns the current month's usage snapshot for the active tenant plus
 * the catalog of add-on packs the doctor can buy. Used by the
 * Settings → Suscripción page.
 */
export async function GET() {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const snapshot = await getUsageSnapshot(auth.tenant.id, auth.tenant.plan)
    return NextResponse.json({
      ...snapshot,
      addonPackages: ADDON_PACKAGES,
    })
  } catch (err) {
    console.error('[GET /api/dashboard/usage] error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
