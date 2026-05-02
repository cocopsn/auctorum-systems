export const dynamic = 'force-dynamic'

/**
 * Historia Clínica NOM-004 — read + partial update por tab.
 *
 *   GET   → { clinicalHistory, identification }
 *   PATCH → body: { tab: '<tabId>', data: <objeto del tab> }
 *           Merge parcial sobre patients.clinical_history JSONB.
 *           Si tab === 'identificacion' también persiste los campos
 *           canónicos (curp, blood_type, etc.) en columnas reales de
 *           patients para mantener consistencia legacy.
 */

import { NextRequest, NextResponse } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { db, patients, auditLog } from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'
import { validateOrigin } from '@/lib/csrf'

type RouteCtx = { params: { id: string } }

const VALID_TABS = [
  'identificacion',
  'heredofamiliares',
  'no_patologicos',
  'patologicos',
  'gineco_obstetricos',
  'padecimiento_actual',
  'exploracion_fisica',
  'diagnostico',
  'tratamiento',
  'pronostico',
] as const

const patchSchema = z.object({
  tab: z.enum(VALID_TABS),
  data: z.record(z.any()),
})

// Identification fields that mirror columns on `patients`.
const IDENTIFICATION_DIRECT_FIELDS: Record<string, keyof typeof patients.$inferInsert> = {
  name:                            'name',
  email:                           'email',
  curp:                            'curp',
  blood_type:                      'bloodType',
  bloodType:                       'bloodType',
  occupation:                      'occupation',
  marital_status:                  'maritalStatus',
  maritalStatus:                   'maritalStatus',
  address:                         'address',
  allergies:                       'allergies',
  birth_date:                      'dateOfBirth',
  birthDate:                       'dateOfBirth',
  dateOfBirth:                     'dateOfBirth',
  gender:                          'gender',
  emergency_contact_name:          'emergencyContactName',
  emergencyContactName:            'emergencyContactName',
  emergency_contact_phone:         'emergencyContactPhone',
  emergencyContactPhone:           'emergencyContactPhone',
  emergency_contact_relationship:  'emergencyContactRelationship',
  emergencyContactRelationship:    'emergencyContactRelationship',
  insurance_provider:              'insuranceProvider',
  insuranceProvider:               'insuranceProvider',
  insurance_policy_number:         'insurancePolicyNumber',
  insurancePolicyNumber:           'insurancePolicyNumber',
  consent_signed:                  'consentSigned',
  consentSigned:                   'consentSigned',
}

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const [patient] = await db
    .select()
    .from(patients)
    .where(and(eq(patients.id, params.id), eq(patients.tenantId, auth.tenant.id)))
    .limit(1)
  if (!patient) return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })

  // Tab 1 reads from canonical columns.
  return NextResponse.json({
    clinicalHistory: patient.clinicalHistory ?? {},
    identification: {
      name: patient.name,
      email: patient.email,
      phone: patient.phone,
      birth_date: patient.dateOfBirth,
      gender: patient.gender,
      curp: patient.curp,
      blood_type: patient.bloodType,
      occupation: patient.occupation,
      marital_status: patient.maritalStatus,
      address: patient.address,
      allergies: patient.allergies,
      emergency_contact_name: patient.emergencyContactName,
      emergency_contact_phone: patient.emergencyContactPhone,
      emergency_contact_relationship: patient.emergencyContactRelationship,
      insurance_provider: patient.insuranceProvider,
      insurance_policy_number: patient.insurancePolicyNumber,
      consent_signed: patient.consentSigned ?? false,
      consent_signed_at: patient.consentSignedAt,
    },
  })
}

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  if (!validateOrigin(req)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let parsed
  try {
    parsed = patchSchema.parse(await req.json())
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Datos inválidos' },
      { status: 400 },
    )
  }

  const [existing] = await db
    .select()
    .from(patients)
    .where(and(eq(patients.id, params.id), eq(patients.tenantId, auth.tenant.id)))
    .limit(1)
  if (!existing) return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })

  // Merge partial JSON
  const current = (existing.clinicalHistory as Record<string, unknown>) ?? {}
  const next = {
    ...current,
    [parsed.tab]: parsed.data,
    updated_at: new Date().toISOString(),
  }

  // Build the update set
  const updates: Record<string, unknown> = {
    clinicalHistory: next,
    updatedAt: new Date(),
  }

  // Tab 1 — sync canonical columns
  if (parsed.tab === 'identificacion') {
    for (const [key, value] of Object.entries(parsed.data)) {
      const col = IDENTIFICATION_DIRECT_FIELDS[key]
      if (!col) continue
      // Special handling: consent_signed_at is set when consent_signed flips true
      if (col === 'consentSigned' && value === true && !existing.consentSigned) {
        updates['consentSignedAt'] = new Date()
      }
      updates[col] = value
    }
  }

  await db
    .update(patients)
    .set(updates)
    .where(and(eq(patients.id, params.id), eq(patients.tenantId, auth.tenant.id)))

  await auditLog({
    tenantId: auth.tenant.id,
    userId: auth.user.id,
    action: 'clinical_history.update',
    entity: `patient:${params.id}`,
    after: { tab: parsed.tab, fields: Object.keys(parsed.data) },
  })

  return NextResponse.json({ success: true, savedAt: new Date().toISOString() })
}
