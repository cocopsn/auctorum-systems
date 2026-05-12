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
import {
  clinicalRecords,
  patients,
  doctors,
  auditLog,
  generateClinicalSignatureHash,
} from '@quote-engine/db'
import { withAuthAndTenant, UnauthorizedError } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { validateOrigin } from '@/lib/csrf'

type RouteCtx = { params: { id: string; recordId: string } }

/**
 * P1-1 migration sentinel: this endpoint is the canonical example of
 * the post-2026-05-12 dashboard route shape. It uses `withAuthAndTenant`
 * which:
 *   1. Validates the Supabase session (rejects with UnauthorizedError),
 *   2. Opens a transaction with `set_config('app.tenant_id', auth.tenant.id)`
 *      so the RLS policies in migration 0056 filter automatically,
 *   3. Hands the caller a `tx` that's pre-scoped — every query inside
 *      is automatically tenant-restricted.
 *
 * Defense-in-depth: we KEEP the explicit `eq(table.tenantId, tenantId)`
 * filters because (a) the connection currently bypasses RLS via the
 * postgres role's rolbypassrls flag, so the policies are advisory until
 * we split the connection pool, and (b) belt-and-suspenders.
 *
 * Once a representative set of endpoints is migrated, the lint rule
 * `eslint-no-unwrapped-db-in-dashboard` (TODO) can flag the rest.
 */
export async function POST(request: NextRequest, { params }: RouteCtx) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }

  try {
    return await withAuthAndTenant(async ({ tx, tenantId, user }) => {
      // Capability gate — only the signing doctor (admin) locks records.
      // Secretaria can prepare drafts but cannot sign. NOM-004 §4.4.
      if (!can(user.role, 'clinical_records.lock')) {
        return NextResponse.json(
          { error: 'Solo el médico tratante puede firmar notas clínicas.', code: 'INSUFFICIENT_ROLE' },
          { status: 403 },
        )
      }

      // Verify patient belongs to tenant
      const [patient] = await tx
        .select({ id: patients.id })
        .from(patients)
        .where(and(eq(patients.id, params.id), eq(patients.tenantId, tenantId)))
        .limit(1)
      if (!patient) {
        return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })
      }

      // Fetch the record
      const [record] = await tx
        .select()
        .from(clinicalRecords)
        .where(
          and(
            eq(clinicalRecords.id, params.recordId),
            eq(clinicalRecords.tenantId, tenantId),
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
      const [doctor] = await tx
        .select({
          id: doctors.id,
          name: doctors.name,
          cedulaProfesional: doctors.cedulaProfesional,
        })
        .from(doctors)
        .where(eq(doctors.tenantId, tenantId))
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
      // Compute the cryptographic signature hash over the canonical
      // payload at lock time. NOM-004 §4.4 — gives anyone with the
      // hash a public way to verify (via /api/verify?hash=…) that the
      // record was signed by this doctor, by this cédula, at this
      // timestamp, without exposing PHI.
      const signatureHash = generateClinicalSignatureHash({
        recordId: record.id,
        tenantId,
        patientId: record.patientId,
        content: record.content,
        doctorId: doctor.id,
        doctorCedula: doctor.cedulaProfesional,
        doctorName: doctor.name,
        vitalSigns: record.vitalSigns,
        diagnosisIcd10: record.diagnosisIcd10,
        diagnosisText: record.diagnosisText,
        treatmentPlan: record.treatmentPlan,
        prognosis: record.prognosis,
        signedAt: now.toISOString(),
      })

      const [updated] = await tx
        .update(clinicalRecords)
        .set({
          isLocked: true,
          isDraft: false, // signed records are no longer drafts
          lockedAt: now,
          lockedBy: user.id,
          doctorId: doctor.id,
          doctorCedula: doctor.cedulaProfesional,
          doctorName: doctor.name,
          signatureHash,
          updatedAt: now,
        })
        .where(eq(clinicalRecords.id, params.recordId))
        .returning()

      await auditLog({
        tenantId,
        userId: user.id,
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
    })
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    throw err
  }
}
