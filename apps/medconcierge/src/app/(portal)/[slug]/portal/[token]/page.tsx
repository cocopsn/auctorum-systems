export const dynamic = "force-dynamic"

import { notFound } from "next/navigation"
import { eq, and, desc, gte, lt } from "drizzle-orm"
import { db, appointments, clinicalRecords, patientFiles } from "@quote-engine/db"
import { getPortalPatient } from "@/lib/portal"
import { PatientPortalView } from "@/components/portal/patient-portal-view"

export default async function PatientPortalPage({
  params,
}: {
  params: { slug: string; token: string }
}) {
  const result = await getPortalPatient(params.slug, params.token)
  if (!result) notFound()

  const { patient, tenant } = result
  const today = new Date().toISOString().split("T")[0]

  const [upcoming, past, records, files] = await Promise.all([
    db
      .select()
      .from(appointments)
      .where(and(
        eq(appointments.patientId, patient.id),
        eq(appointments.tenantId, tenant.id),
        gte(appointments.date, today),
      ))
      .orderBy(appointments.date, appointments.startTime)
      .limit(20),
    db
      .select()
      .from(appointments)
      .where(and(
        eq(appointments.patientId, patient.id),
        eq(appointments.tenantId, tenant.id),
        lt(appointments.date, today),
      ))
      .orderBy(desc(appointments.date))
      .limit(50),
    db
      .select()
      .from(clinicalRecords)
      .where(and(
        eq(clinicalRecords.patientId, patient.id),
        eq(clinicalRecords.tenantId, tenant.id),
      ))
      .orderBy(desc(clinicalRecords.createdAt))
      .limit(50),
    db
      .select()
      .from(patientFiles)
      .where(and(
        eq(patientFiles.patientId, patient.id),
        eq(patientFiles.tenantId, tenant.id),
      ))
      .orderBy(desc(patientFiles.createdAt)),
  ])

  const prescriptions = past
    .filter(a => a.prescription && a.status === "completed")
    .map(a => ({
      id: a.id,
      date: a.date,
      prescription: a.prescription!,
      diagnosis: a.diagnosis,
    }))

  const notePlans = records
    .filter(n => n.soapPlan)
    .map(n => ({
      id: n.id,
      date: n.createdAt
        ? new Date(n.createdAt).toISOString().split("T")[0]
        : "",
      plan: n.soapPlan!,
      assessment: n.soapAssessment,
    }))

  return (
    <PatientPortalView
      patient={patient}
      tenantName={tenant.name}
      upcoming={upcoming}
      past={past}
      prescriptions={prescriptions}
      notePlans={notePlans}
      files={files}
      slug={params.slug}
      token={params.token}
    />
  )
}
