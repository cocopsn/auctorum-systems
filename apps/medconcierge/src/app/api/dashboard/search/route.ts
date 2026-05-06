export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { and, desc, eq, ilike, or } from 'drizzle-orm'
import { db, patients, appointments } from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'

/**
 * GET /api/dashboard/search?q=<query>
 *
 * Global search across patients (name/phone/email) and appointments
 * (joined with patient for name search). Returns up to 5 results per
 * category. Tenant-scoped.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
    if (q.length < 2) return NextResponse.json({ results: { patients: [], appointments: [] } })

    const term = `%${q}%`

    const patientResults = await db
      .select({
        id: patients.id,
        name: patients.name,
        phone: patients.phone,
      })
      .from(patients)
      .where(
        and(
          eq(patients.tenantId, auth.tenant.id),
          or(
            ilike(patients.name, term),
            ilike(patients.phone, term),
            ilike(patients.email, term),
          ),
        ),
      )
      .limit(5)

    const appointmentResults = await db
      .select({
        id: appointments.id,
        patientName: patients.name,
        date: appointments.date,
        startTime: appointments.startTime,
      })
      .from(appointments)
      .innerJoin(patients, eq(appointments.patientId, patients.id))
      .where(and(eq(appointments.tenantId, auth.tenant.id), ilike(patients.name, term)))
      .orderBy(desc(appointments.date))
      .limit(5)

    return NextResponse.json({
      results: {
        patients: patientResults.map((p) => ({
          type: 'patient' as const,
          id: p.id,
          title: p.name,
          subtitle: p.phone,
          url: `/pacientes/${p.id}`,
        })),
        appointments: appointmentResults.map((a) => ({
          type: 'appointment' as const,
          id: a.id,
          title: a.patientName ?? '(sin nombre)',
          subtitle: `Cita ${a.date} ${a.startTime}`,
          url: '/agenda',
        })),
      },
    })
  } catch (err) {
    console.error('[GET /api/dashboard/search] error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
