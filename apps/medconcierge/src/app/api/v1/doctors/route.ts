export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db, doctors } from '@quote-engine/db'
import { authenticateApiKey, apiUnauthorized, apiForbidden, apiRateLimit, apiRequirePlan } from '@/lib/api-auth'

/**
 * GET /api/v1/doctors — list doctors registered in the tenant.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateApiKey(req)
    if (!auth) return apiUnauthorized()
    const planGate = apiRequirePlan(auth.tenant.plan, 'api_access')
    if (planGate) return planGate
    if (!auth.permissions.includes('read')) return apiForbidden('read')
    const rl = await apiRateLimit(auth.tenant.id, auth.tenant.plan)
    if (rl) return rl

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
