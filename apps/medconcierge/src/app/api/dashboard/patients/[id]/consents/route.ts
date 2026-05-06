export const dynamic = 'force-dynamic'

/**
 * Informed consents — list + create+sign.
 *
 *   GET  → array of consents for this patient
 *   POST → create + sign (irreversible). Body must include patient_signature
 *          base64. doctor_signature defaults to doctor.digital_signature
 *          unless overridden in body.
 */

import { NextRequest, NextResponse } from 'next/server'
import { eq, and, desc } from 'drizzle-orm'
import { z } from 'zod'
import { db, informedConsents, patients, doctors, auditLog } from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'
import { validateOrigin } from '@/lib/csrf'

type RouteCtx = { params: { id: string } }

const createSchema = z.object({
  procedureName: z.string().min(2).max(255),
  description: z.string().min(10).max(8000),
  risks: z.string().min(10).max(8000),
  alternatives: z.string().max(4000).optional(),
  patientSignature: z.string().regex(/^data:image\//, 'Firma del paciente requerida'),
  doctorSignature: z.string().regex(/^data:image\//).optional(),
})

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Verify patient belongs to tenant
  const [patient] = await db
    .select({ id: patients.id })
    .from(patients)
    .where(and(eq(patients.id, params.id), eq(patients.tenantId, auth.tenant.id)))
    .limit(1)
  if (!patient) return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })

  const rows = await db
    .select()
    .from(informedConsents)
    .where(
      and(
        eq(informedConsents.patientId, params.id),
        eq(informedConsents.tenantId, auth.tenant.id),
      ),
    )
    .orderBy(desc(informedConsents.signedAt))

  return NextResponse.json({ consents: rows })
}

export async function POST(req: NextRequest, { params }: RouteCtx) {
  if (!validateOrigin(req)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Patient must belong to tenant
  const [patient] = await db
    .select({ id: patients.id, name: patients.name })
    .from(patients)
    .where(and(eq(patients.id, params.id), eq(patients.tenantId, auth.tenant.id)))
    .limit(1)
  if (!patient) return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })

  let body
  try {
    body = createSchema.parse(await req.json())
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Datos inválidos' },
      { status: 400 },
    )
  }

  // Get doctor profile (for digital signature fallback + ID snapshot)
  const [doctor] = await db
    .select()
    .from(doctors)
    .where(eq(doctors.tenantId, auth.tenant.id))
    .limit(1)

  const doctorSignature = body.doctorSignature || doctor?.digitalSignature
  if (!doctorSignature) {
    return NextResponse.json(
      {
        error:
          'Configura tu firma digital en Configuración → Datos Profesionales antes de firmar consentimientos.',
        code: 'MISSING_DOCTOR_SIGNATURE',
      },
      { status: 400 },
    )
  }

  const [created] = await db
    .insert(informedConsents)
    .values({
      tenantId: auth.tenant.id,
      patientId: params.id,
      doctorId: doctor?.id ?? null,
      procedureName: body.procedureName,
      description: body.description,
      risks: body.risks,
      alternatives: body.alternatives ?? null,
      patientSignature: body.patientSignature,
      doctorSignature,
      signedAt: new Date(),
    })
    .returning()

  await auditLog({
    tenantId: auth.tenant.id,
    userId: auth.user.id,
    action: 'consent.sign',
    entity: `informed_consent:${created.id}`,
    after: {
      patientId: params.id,
      patientName: patient.name,
      procedureName: body.procedureName,
    },
  })

  return NextResponse.json({ success: true, consent: created })
}
