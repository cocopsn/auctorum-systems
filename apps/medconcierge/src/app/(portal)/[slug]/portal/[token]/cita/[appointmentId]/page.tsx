export const dynamic = "force-dynamic"

import { notFound } from "next/navigation"
import { eq, and } from "drizzle-orm"
import { db, appointments, clinicalRecords } from "@quote-engine/db"
import { getPortalPatient } from "@/lib/portal"
import { AppointmentDetailView } from "@/components/portal/appointment-detail-view"

export default async function AppointmentDetailPage({
  params,
}: {
  params: { slug: string; token: string; appointmentId: string }
}) {
  const result = await getPortalPatient(params.slug, params.token)
  if (!result) notFound()

  const { patient, tenant } = result

  const [appointment] = await db
    .select()
    .from(appointments)
    .where(and(
      eq(appointments.id, params.appointmentId),
      eq(appointments.patientId, patient.id),
      eq(appointments.tenantId, tenant.id),
    ))
    .limit(1)

  if (!appointment) notFound()

  const [record] = appointment.id
    ? await db
        .select()
        .from(clinicalRecords)
        .where(and(
          eq(clinicalRecords.appointmentId, appointment.id),
          eq(clinicalRecords.tenantId, tenant.id),
        ))
        .limit(1)
    : [undefined]

  return (
    <AppointmentDetailView
      appointment={appointment}
      note={record ?? null}
      tenantName={tenant.name}
      slug={params.slug}
      token={params.token}
    />
  )
}
