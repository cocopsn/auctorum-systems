export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { eq, ilike, or, desc } from 'drizzle-orm'
import { db } from '@quote-engine/db'
import { patients, tenants } from '@quote-engine/db'

// SEC-06 AUTH AUDIT: NO AUTHENTICATION IS ENFORCED on this dashboard route.
// getTenantId() is hardcoded to 'dra-martinez' instead of deriving tenant
// from an authenticated session. GET handler is publicly accessible, exposing
// patient PII (name, phone, email, DOB, medical info).
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

export async function GET(request: NextRequest) {
  const tenantId = await getTenantId()
  if (!tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const search = searchParams.get('search')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const offset = (page - 1) * limit

  try {
    const conditions = [eq(patients.tenantId, tenantId)]

    if (search) {
      conditions.push(
        or(
          ilike(patients.name, `%${search}%`),
          ilike(patients.phone, `%${search}%`)
        )!
      )
    }

    const results = await db
      .select()
      .from(patients)
      .where(conditions.length > 1 ? (conditions[0] && conditions[1] ? undefined : conditions[0]) : conditions[0])
      .orderBy(desc(patients.lastAppointmentAt))
      .limit(limit)
      .offset(offset)

    // Simplified: just filter by tenant + search
    let filtered = await db
      .select()
      .from(patients)
      .where(eq(patients.tenantId, tenantId))
      .orderBy(desc(patients.lastAppointmentAt))
      .limit(limit)
      .offset(offset)

    if (search) {
      const s = search.toLowerCase()
      filtered = filtered.filter(
        (p) => p.name.toLowerCase().includes(s) || p.phone.includes(s)
      )
    }

    return NextResponse.json({ patients: filtered, page, limit })
  } catch (error) {
    console.error('Patients API error:', error)
    return NextResponse.json({ error: 'Error fetching patients' }, { status: 500 })
  }
}
