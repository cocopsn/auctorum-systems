import { NextResponse } from 'next/server'
import { eq, and, desc } from 'drizzle-orm'
import { db, patients, patientFiles, appointments, clinicalNotes } from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const [patient] = await db
      .select()
      .from(patients)
      .where(and(eq(patients.id, params.id), eq(patients.tenantId, auth.tenant.id)))
      .limit(1)

    if (!patient) {
      return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })
    }

    const [files, patientAppointments, notes] = await Promise.all([
      db
        .select()
        .from(patientFiles)
        .where(eq(patientFiles.patientId, patient.id))
        .orderBy(desc(patientFiles.createdAt)),
      db
        .select()
        .from(appointments)
        .where(eq(appointments.patientId, patient.id))
        .orderBy(desc(appointments.date))
        .limit(20),
      db
        .select()
        .from(clinicalNotes)
        .where(eq(clinicalNotes.patientId, patient.id))
        .orderBy(desc(clinicalNotes.createdAt))
        .limit(10),
    ])

    return NextResponse.json({ patient, files, appointments: patientAppointments, notes })
  } catch (err: any) {
    console.error('Patient detail GET error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
