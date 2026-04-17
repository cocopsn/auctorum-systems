import { NextResponse } from 'next/server'
import { and, asc, eq, gte, lte } from 'drizzle-orm'
import { db, appointments, patients } from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const today = new Date().toISOString().split('T')[0]
    const in2days = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0]

    const rows = await db
      .select({
        id: appointments.id,
        date: appointments.date,
        startTime: appointments.startTime,
        status: appointments.status,
        reminder24hSent: appointments.reminder24hSent,
        reminder24hSentAt: appointments.reminder24hSentAt,
        reminder2hSent: appointments.reminder2hSent,
        reminder2hSentAt: appointments.reminder2hSentAt,
        confirmedByPatient: appointments.confirmedByPatient,
        patientName: patients.name,
        patientPhone: patients.phone,
      })
      .from(appointments)
      .innerJoin(patients, eq(patients.id, appointments.patientId))
      .where(
        and(
          eq(appointments.tenantId, auth.tenant.id),
          eq(appointments.status, 'scheduled'),
          gte(appointments.date, today),
          lte(appointments.date, in2days),
        ),
      )
      .orderBy(asc(appointments.date), asc(appointments.startTime))

    return NextResponse.json({ rows })
  } catch (err: any) {
    console.error('Recordatorios GET error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
