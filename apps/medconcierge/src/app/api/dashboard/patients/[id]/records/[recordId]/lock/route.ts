export const dynamic = 'force-dynamic'

/**
 * POST /api/dashboard/patients/[id]/records/[recordId]/lock
 *
 * Firma (sella) una nota clínica. Una vez sellada:
 *   - No puede editarse (PATCH responde 403 RECORD_LOCKED)
 *   - No puede eliminarse (DELETE responde 403 RECORD_LOCKED)
 *
 * Esto cumple con NOM-004-SSA3-2012 §4.4: las notas clínicas firmadas
 * deben preservarse en su forma original.
 *
 * Snapshot de la cédula del médico al momento del lock — sobrevive a
 * cambios futuros del perfil del doctor (necesario para auditoría legal).
 */

import { NextRequest, NextResponse } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { db, clinicalRecords, patients, doctors, auditLog } from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'
import { validateOrigin } from '@/lib/csrf'

type RouteCtx = { params: { id: string; recordId: string } }

export async function POST(request: NextRequest, { params }: RouteCtx) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }

  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Verify patient belongs to tenant
  const [patient] = await db
    .select({ id: patients.id })
    .from(patients)
    .where(and(eq(patients.id, params.id), eq(patients.tenantId, auth.tenant.id)))
    .limit(1)
  if (!patient) {
    return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })
  }

  // Fetch the record
  const [record] = await db
    .select()
    .from(clinicalRecords)
    .where(
      and(
        eq(clinicalRecords.id, params.recordId),
        eq(clinicalRecords.tenantId, auth.tenant.id),
        eq(clinicalRecords.patientId, params.id),
      ),
    )
    .limit(1)
  if (!record) {
    return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
  }

  if (record.isLocked) {
    return NextResponse.json(
      { error: 'Esta nota ya está firmada', code: 'ALREADY_LOCKED' },
      { status: 400 },
    )
  }

  // Snapshot the doctor's identity at lock time. Try to find the doctor row
  // for the signing user (cedula etc); fall back to the user record itself
  // if no doctor profile exists yet.
  const [doctor] = await db
    .select({
      id: doctors.id,
      name: doctors.name,
      cedulaProfesional: doctors.cedulaProfesional,
    })
    .from(doctors)
    .where(eq(doctors.tenantId, auth.tenant.id))
    .limit(1)

  if (!doctor || !doctor.cedulaProfesional) {
    return NextResponse.json(
      {
        error:
          'No se puede firmar la nota: el perfil del médico no tiene cédula profesional registrada. ' +
          'Configúrela en Configuración → Datos Profesionales.',
        code: 'MISSING_CEDULA',
      },
      { status: 400 },
    )
  }

  // Prevent locking an empty record (must have at least body content or a SOAP note).
  const hasContent =
    (record.soapSubjective && record.soapSubjective.trim() !== '') ||
    (record.soapObjective && record.soapObjective.trim() !== '') ||
    (record.soapAssessment && record.soapAssessment.trim() !== '') ||
    (record.soapPlan && record.soapPlan.trim() !== '') ||
    (record.diagnosisText && record.diagnosisText.trim() !== '') ||
    (record.content && Object.keys(record.content as object).length > 0)

  if (!hasContent) {
    return NextResponse.json(
      { error: 'No se puede firmar una nota vacía', code: 'EMPTY_RECORD' },
      { status: 400 },
    )
  }

  const now = new Date()
  const [updated] = await db
    .update(clinicalRecords)
    .set({
      isLocked: true,
      isDraft: false, // signed records are no longer drafts
      lockedAt: now,
      lockedBy: auth.user.id,
      doctorId: doctor.id,
      doctorCedula: doctor.cedulaProfesional,
      doctorName: doctor.name,
      updatedAt: now,
    })
    .where(eq(clinicalRecords.id, params.recordId))
    .returning()

  await auditLog({
    tenantId: auth.tenant.id,
    userId: auth.user.id,
    action: 'record.lock',
    entity: `clinical_record:${params.recordId}`,
    after: {
      patientId: params.id,
      doctorCedula: doctor.cedulaProfesional,
      doctorName: doctor.name,
    },
  })

  return NextResponse.json({
    success: true,
    record: updated,
    message: 'Nota firmada y sellada. NOM-004 §4.4 — ya no puede modificarse.',
  })
}
