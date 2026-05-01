export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { eq, and, desc, sql } from "drizzle-orm"
import { db, clinicalRecords, patients, patientFiles } from "@quote-engine/db"
import { getAuthTenant } from "@/lib/auth"
import { validateOrigin } from "@/lib/csrf"
import { z } from "zod"

const RECORD_TYPES = [
  "general", "consultation", "soap", "follow_up", "lab_result",
  "prescription", "referral", "procedure", "imaging", "first_visit",
] as const

const createSchema = z.object({
  title: z.string().max(255).optional(),
  recordType: z.enum(RECORD_TYPES).default("general"),
  content: z.any().default({}),
  soapSubjective: z.string().max(10000).nullable().optional(),
  soapObjective: z.string().max(10000).nullable().optional(),
  soapAssessment: z.string().max(10000).nullable().optional(),
  soapPlan: z.string().max(10000).nullable().optional(),
  appointmentId: z.string().uuid().nullable().optional(),
  isDraft: z.boolean().default(true),
  isPinned: z.boolean().default(false),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const [patient] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(and(eq(patients.id, params.id), eq(patients.tenantId, auth.tenant.id)))
      .limit(1)
    if (!patient) return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 })

    const { searchParams } = request.nextUrl
    const type = searchParams.get("type")
    const draft = searchParams.get("draft")

    const conditions = [
      eq(clinicalRecords.patientId, params.id),
      eq(clinicalRecords.tenantId, auth.tenant.id),
      eq(clinicalRecords.isTemplate, false),
    ]

    if (type && type !== "all") {
      conditions.push(eq(clinicalRecords.recordType, type))
    }
    if (draft === "false") {
      conditions.push(eq(clinicalRecords.isDraft, false))
    }

    const records = await db
      .select()
      .from(clinicalRecords)
      .where(and(...conditions))
      .orderBy(desc(clinicalRecords.isPinned), desc(clinicalRecords.createdAt))

    // File counts per record
    const fileCounts = await db
      .select({
        recordId: patientFiles.clinicalRecordId,
        count: sql<number>`count(*)::int`,
      })
      .from(patientFiles)
      .where(and(
        eq(patientFiles.patientId, params.id),
        eq(patientFiles.tenantId, auth.tenant.id),
      ))
      .groupBy(patientFiles.clinicalRecordId)

    const fileCountMap: Record<string, number> = {}
    for (const row of fileCounts) {
      if (row.recordId) fileCountMap[row.recordId] = row.count
    }

    const recordsWithFiles = records.map(r => ({
      ...r,
      fileCount: fileCountMap[r.id] ?? 0,
    }))

    return NextResponse.json({ records: recordsWithFiles })
  } catch (err) {
    console.error("Records GET error:", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
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
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const [record] = await db.insert(clinicalRecords).values({
      tenantId: auth.tenant.id,
      patientId: params.id,
      authorId: auth.user.id,
      title: parsed.data.title || "Sin título",
      recordType: parsed.data.recordType,
      content: parsed.data.content,
      soapSubjective: parsed.data.soapSubjective || null,
      soapObjective: parsed.data.soapObjective || null,
      soapAssessment: parsed.data.soapAssessment || null,
      soapPlan: parsed.data.soapPlan || null,
      appointmentId: parsed.data.appointmentId || null,
      isDraft: parsed.data.isDraft,
      isPinned: parsed.data.isPinned,
    }).returning()

    return NextResponse.json({ record })
  } catch (err) {
    console.error("Records POST error:", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
