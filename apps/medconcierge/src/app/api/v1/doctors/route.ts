export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db, doctors } from '@quote-engine/db'
import { authenticateApiKey, apiUnauthorized, apiForbidden } from '@/lib/api-auth'

/**
 * GET /api/v1/doctors — list doctors registered in the tenant.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateApiKey(req)
    if (!auth) return apiUnauthorized()
    if (!auth.permissions.includes('read')) return apiForbidden('read')

    const rows = await db
      .select()
      .from(doctors)
      .where(eq(doctors.tenantId, auth.tenant.id))

    return NextResponse.json({
      data: rows,
      meta: { total: rows.length },
    })
  } catch (err) {
    console.error('[GET /api/v1/doctors] error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
