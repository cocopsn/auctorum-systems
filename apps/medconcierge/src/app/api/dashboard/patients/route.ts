export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { eq, ilike, or, desc, sql } from 'drizzle-orm'
import { db, patients, patientNotes } from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'

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

    // Get notes count per patient
    const patientIds = filtered.map(p => p.id)
    let notesCounts: Record<string, number> = {}

    if (patientIds.length > 0) {
      const counts = await db
        .select({
          patientId: patientNotes.patientId,
          count: sql<number>`count(*)::int`,
        })
        .from(patientNotes)
        .where(eq(patientNotes.tenantId, tenantId))
        .groupBy(patientNotes.patientId)

      for (const row of counts) {
        notesCounts[row.patientId] = row.count
      }
    }

    const patientsWithNotes = filtered.map(p => ({
      ...p,
      notesCount: notesCounts[p.id] ?? 0,
    }))

    return NextResponse.json({ patients: patientsWithNotes, page, limit })
  } catch (error) {
    console.error('Patients API error:', error)
    return NextResponse.json({ error: 'Error fetching patients' }, { status: 500 })
  }
}
