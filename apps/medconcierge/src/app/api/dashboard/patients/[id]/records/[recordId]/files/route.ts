export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { db, patients, patientFiles, clinicalRecords } from "@quote-engine/db"
import { eq, and } from "drizzle-orm"
import { getAuthTenant } from "@/lib/auth"
import { validateOrigin } from "@/lib/csrf"
import { uploadPatientFile } from "@/lib/storage"

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg", "image/png", "image/webp", "image/heic",
])
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

type RouteCtx = { params: { id: string; recordId: string } }

export async function POST(request: NextRequest, { params }: RouteCtx) {
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

    // Verify record exists and belongs to patient
    const [record] = await db
      .select({ id: clinicalRecords.id })
      .from(clinicalRecords)
      .where(and(
        eq(clinicalRecords.id, params.recordId),
        eq(clinicalRecords.tenantId, auth.tenant.id),
        eq(clinicalRecords.patientId, params.id),
      ))
      .limit(1)
    if (!record) return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 })

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const description = (formData.get("description") as string) || null

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Tipo de archivo no permitido" }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Archivo demasiado grande (máx 10 MB)" }, { status: 400 })
    }

    const fileId = randomUUID()
    const storagePath = await uploadPatientFile({
      tenantId: auth.tenant.id,
      patientId: params.id,
      fileId,
      file,
    })

    const [inserted] = await db.insert(patientFiles).values({
      id: fileId,
      tenantId: auth.tenant.id,
      patientId: params.id,
      clinicalRecordId: params.recordId,
      uploadedByUserId: auth.user.id,
      filename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      storagePath,
      description,
    }).returning()

    return NextResponse.json({ file: inserted })
  } catch (err) {
    console.error("Record file upload error:", err)
    return NextResponse.json({ error: "Error al subir archivo" }, { status: 500 })
  }
}
