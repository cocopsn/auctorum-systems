export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { eq, ilike, or, desc } from 'drizzle-orm'
import { db } from '@quote-engine/db'
import { patients } from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'
import { z } from 'zod';

export async function GET(request: NextRequest) {
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenantId = auth.tenant.id

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
