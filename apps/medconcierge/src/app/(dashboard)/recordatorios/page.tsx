export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { and, asc, eq, gte, lte } from 'drizzle-orm'
import { db, appointments, patients } from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'
import { RecordatoriosTable } from '@/components/dashboard/recordatorios-table'

export default async function RecordatoriosPage() {
  const auth = await getAuthTenant()
  if (!auth) redirect('/login')

  const today = new Date().toISOString().split('T')[0]
  const in2days = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0]

  const rows = await db
    .select({
      id: appointments.id,
      date: appointments.date,
      startTime: appointments.startTime,
      status: appointments.status,
      reminder24hSent: appointments.reminder24hSent,
      reminder24hSentAt: appointments.reminder24hSentAt,
      reminder2hSent: appointments.reminder2hSent,
      reminder2hSentAt: appointments.reminder2hSentAt,
      confirmedByPatient: appointments.confirmedByPatient,
      patientName: patients.name,
      patientPhone: patients.phone,
    })
    .from(appointments)
    .innerJoin(patients, eq(patients.id, appointments.patientId))
    .where(
      and(
        eq(appointments.tenantId, auth.tenant.id),
        eq(appointments.status, 'scheduled'),
        gte(appointments.date, today),
        lte(appointments.date, in2days),
      ),
    )
    .orderBy(asc(appointments.date), asc(appointments.startTime))

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Recordatorios</h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-0.5">
          Citas próximas (hoy y siguientes 48h) y estado de envío de recordatorios automáticos.
        </p>
      </div>
      <RecordatoriosTable rows={rows} />
    </div>
  )
}
