export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { eq, and } from 'drizzle-orm'
import { db, appointments, clinicalNotes } from '@quote-engine/db'
import { getPortalPatient } from '@/lib/portal'
import { AppointmentDetailView } from '@/components/portal/appointment-detail-view'

// ============================================================
// Patient portal — appointment detail page (server component).
// Shows a single appointment with prescription + clinical note
// (assessment + plan only, NOT subjective/objective).
// ============================================================

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

  const [note] = appointment.id
    ? await db
        .select()
        .from(clinicalNotes)
        .where(and(
          eq(clinicalNotes.appointmentId, appointment.id),
          eq(clinicalNotes.tenantId, tenant.id),
        ))
        .limit(1)
    : [undefined]

  return (
    <AppointmentDetailView
      appointment={appointment}
      note={note ?? null}
      tenantName={tenant.name}
      slug={params.slug}
      token={params.token}
    />
  )
}
