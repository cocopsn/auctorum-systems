export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { eq, and } from "drizzle-orm"
import { db, clinicalRecords, patients, patientFiles } from "@quote-engine/db"
import { getAuthTenant } from "@/lib/auth"
import { validateOrigin } from "@/lib/csrf"
import { deletePatientFile, getPatientFileSignedUrl } from "@/lib/storage"
import { z } from "zod"

const updateSchema = z.object({
  title: z.string().max(255).optional(),
  recordType: z.string().max(32).optional(),
  content: z.any().optional(),
  soapSubjective: z.string().max(10000).nullable().optional(),
  soapObjective: z.string().max(10000).nullable().optional(),
  soapAssessment: z.string().max(10000).nullable().optional(),
  soapPlan: z.string().max(10000).nullable().optional(),
  isPinned: z.boolean().optional(),
  isDraft: z.boolean().optional(),
  appointmentId: z.string().uuid().nullable().optional(),
  // NOM-004 structured medical fields. None of these are locked-mutable —
  // they're rejected at the lock check below.
  vitalSigns: z.record(z.any()).optional(),
  diagnosisIcd10: z.string().max(10).nullable().optional(),
  diagnosisText: z.string().max(2000).nullable().optional(),
  treatmentPlan: z.string().max(10000).nullable().optional(),
  prognosis: z.string().max(2000).nullable().optional(),
}).strict()

type RouteCtx = { params: { id: string; recordId: string } }

export async function GET(_request: NextRequest, { params }: RouteCtx) {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const [patient] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(and(eq(patients.id, params.id), eq(patients.tenantId, auth.tenant.id)))
      .limit(1)
    if (!patient) return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 })

    const [record] = await db
      .select()
      .from(clinicalRecords)
      .where(and(
        eq(clinicalRecords.id, params.recordId),
        eq(clinicalRecords.tenantId, auth.tenant.id),
        eq(clinicalRecords.patientId, params.id),
      ))
      .limit(1)
    if (!record) return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 })

    const files = await db
      .select()
      .from(patientFiles)
      .where(and(
        eq(patientFiles.clinicalRecordId, params.recordId),
        eq(patientFiles.tenantId, auth.tenant.id),
      ))

    const filesWithUrls = await Promise.all(
      files.map(async (f) => {
        try {
          const signedUrl = await getPatientFileSignedUrl(f.storagePath, 3600)
          return { ...f, signedUrl }
        } catch {
          return { ...f, signedUrl: null }
        }
      })
    )

    return NextResponse.json({ record, files: filesWithUrls })
  } catch (err) {
    console.error("Record GET error:", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteCtx) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: "Invalid origin" }, { status: 403 })
    }
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const [patient] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(and(eq(patients.id, params.id), eq(patients.tenantId, auth.tenant.id)))
      .limit(1)
    if (!patient) return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 })

    // NOM-004 §4.4 — once a record is locked (signed), it CANNOT be edited.
    const [existing] = await db
      .select({ id: clinicalRecords.id, isLocked: clinicalRecords.isLocked })
      .from(clinicalRecords)
      .where(and(
        eq(clinicalRecords.id, params.recordId),
        eq(clinicalRecords.tenantId, auth.tenant.id),
        eq(clinicalRecords.patientId, params.id),
      ))
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 })

    if (existing.isLocked) {
      return NextResponse.json(
        {
          error: 'Esta nota clínica ya fue firmada y no puede ser modificada (NOM-004-SSA3-2012, §4.4)',
          code: 'RECORD_LOCKED',
        },
        { status: 403 },
      )
    }

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Datos invalidos" }, { status: 400 })
    }

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
      lastSavedAt: new Date(),
    }
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined) updates[key] = value
    }

    const [updated] = await db
      .update(clinicalRecords)
      .set(updates)
      .where(and(
        eq(clinicalRecords.id, params.recordId),
        eq(clinicalRecords.tenantId, auth.tenant.id),
        eq(clinicalRecords.patientId, params.id),
      ))
      .returning()

    if (!updated) return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 })

    return NextResponse.json({ record: updated, savedAt: updated.lastSavedAt })
  } catch (err) {
    console.error("Record PATCH error:", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteCtx) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: "Invalid origin" }, { status: 403 })
    }
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const [patient] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(and(eq(patients.id, params.id), eq(patients.tenantId, auth.tenant.id)))
      .limit(1)
    if (!patient) return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 })

    // NOM-004 §4.4 — locked records are immutable (no edit, no delete).
    // Per the 5-year retention rule, we never hard-delete locked notes.
    const [existing] = await db
      .select({ id: clinicalRecords.id, isLocked: clinicalRecords.isLocked })
      .from(clinicalRecords)
      .where(and(
        eq(clinicalRecords.id, params.recordId),
        eq(clinicalRecords.tenantId, auth.tenant.id),
        eq(clinicalRecords.patientId, params.id),
      ))
      .limit(1)
    if (!existing) return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 })

    if (existing.isLocked) {
      return NextResponse.json(
        {
          error: 'Las notas clínicas firmadas no pueden eliminarse (NOM-004-SSA3-2012, §4.4 y retención 5 años).',
          code: 'RECORD_LOCKED',
        },
        { status: 403 },
      )
    }

    const files = await db
      .select({ storagePath: patientFiles.storagePath })
      .from(patientFiles)
      .where(and(
        eq(patientFiles.clinicalRecordId, params.recordId),
        eq(patientFiles.tenantId, auth.tenant.id),
      ))

    for (const file of files) {
      try { await deletePatientFile(file.storagePath) } catch { /* storage cleanup best-effort */ }
    }

    const [deleted] = await db
      .delete(clinicalRecords)
      .where(and(
        eq(clinicalRecords.id, params.recordId),
        eq(clinicalRecords.tenantId, auth.tenant.id),
        eq(clinicalRecords.patientId, params.id),
      ))
      .returning()

    if (!deleted) return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Record DELETE error:", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
