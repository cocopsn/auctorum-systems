export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { eq, and, desc } from "drizzle-orm"
import { db, clinicalRecords, appointments, patients, patientFiles } from "@quote-engine/db"
import { getAuthTenant } from "@/lib/auth"

export async function GET(
  _request: NextRequest,
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

    const [records, appts, files] = await Promise.all([
      db
        .select({
          id: clinicalRecords.id,
          title: clinicalRecords.title,
          recordType: clinicalRecords.recordType,
          createdAt: clinicalRecords.createdAt,
          isDraft: clinicalRecords.isDraft,
        })
        .from(clinicalRecords)
        .where(and(
          eq(clinicalRecords.patientId, params.id),
          eq(clinicalRecords.tenantId, auth.tenant.id),
        ))
        .orderBy(desc(clinicalRecords.createdAt))
        .limit(50),
      db
        .select({
          id: appointments.id,
          date: appointments.date,
          startTime: appointments.startTime,
          status: appointments.status,
          reason: appointments.reason,
        })
        .from(appointments)
        .where(and(
          eq(appointments.patientId, params.id),
          eq(appointments.tenantId, auth.tenant.id),
        ))
        .orderBy(desc(appointments.date))
        .limit(50),
      db
        .select({
          id: patientFiles.id,
          filename: patientFiles.filename,
          mimeType: patientFiles.mimeType,
          createdAt: patientFiles.createdAt,
        })
        .from(patientFiles)
        .where(and(
          eq(patientFiles.patientId, params.id),
          eq(patientFiles.tenantId, auth.tenant.id),
        ))
        .orderBy(desc(patientFiles.createdAt))
        .limit(50),
    ])

    type TimelineItem = {
      type: "record" | "appointment" | "file"
      date: string
      data: Record<string, unknown>
    }

    const items: TimelineItem[] = [
      ...records.map(r => ({
        type: "record" as const,
        date: r.createdAt.toISOString(),
        data: r as unknown as Record<string, unknown>,
      })),
      ...appts.map(a => ({
        type: "appointment" as const,
        date: new Date(a.date + "T" + a.startTime).toISOString(),
        data: a as unknown as Record<string, unknown>,
      })),
      ...files.map(f => ({
        type: "file" as const,
        date: f.createdAt.toISOString(),
        data: f as unknown as Record<string, unknown>,
      })),
    ]

    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json({ items: items.slice(0, 100) })
  } catch (err) {
    console.error("Timeline GET error:", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
