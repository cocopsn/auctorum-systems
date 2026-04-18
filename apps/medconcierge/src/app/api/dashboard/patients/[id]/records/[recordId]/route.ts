export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { eq, and } from "drizzle-orm"
import { db, clinicalRecords, patients, patientFiles } from "@quote-engine/db"
import { getAuthTenant } from "@/lib/auth"
import { validateOrigin } from "@/lib/csrf"
import { deletePatientFile } from "@/lib/storage"
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
}).strict()

type RouteCtx = { params: { id: string; recordId: string } }

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

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Datos inválidos" }, { status: 400 })
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

    // Delete associated files from storage
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
