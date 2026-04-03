export const dynamic = "force-dynamic";

import { notFound } from 'next/navigation'
import { eq, and, desc } from 'drizzle-orm'
import { db } from '@quote-engine/db'
import { patients, appointments, clinicalNotes, tenants } from '@quote-engine/db'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { User, Phone, Mail, Shield, AlertTriangle, Calendar } from 'lucide-react'

async function getTenantId() {
  const [tenant] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, 'dra-martinez'))
    .limit(1)
  return tenant?.id
}

export default async function PatientDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const tenantId = await getTenantId()
  if (!tenantId) notFound()

  const [patient] = await db
    .select()
    .from(patients)
    .where(and(eq(patients.id, params.id), eq(patients.tenantId, tenantId)))
    .limit(1)

  if (!patient) notFound()

  const patientAppointments = await db
    .select()
    .from(appointments)
    .where(eq(appointments.patientId, patient.id))
    .orderBy(desc(appointments.date))
    .limit(20)

  const notes = await db
    .select()
    .from(clinicalNotes)
    .where(eq(clinicalNotes.patientId, patient.id))
    .orderBy(desc(clinicalNotes.createdAt))
    .limit(10)

  return (
    <div>
      <div className="mb-6">
        <a href="/pacientes" className="text-sm text-[var(--text-tertiary)] hover:text-[var(--accent)]">
          ← Volver a pacientes
        </a>
      </div>

      {/* Patient Info */}
      <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
            <User className="w-8 h-8 text-[var(--text-tertiary)]" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">{patient.name}</h1>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-[var(--text-secondary)]">
              <span className="flex items-center gap-1"><Phone className="w-4 h-4" />{patient.phone}</span>
              {patient.email && <span className="flex items-center gap-1"><Mail className="w-4 h-4" />{patient.email}</span>}
              {patient.gender && <span>{patient.gender}</span>}
              {patient.dateOfBirth && <span>Nac. {patient.dateOfBirth}</span>}
              {patient.bloodType && <span>Tipo {patient.bloodType}</span>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-[var(--text-tertiary)]">Total gastado</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">${Number(patient.totalSpent ?? 0).toLocaleString()}</p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-[var(--border)]">
          <div className="text-center">
            <p className="text-2xl font-bold text-[var(--text-primary)]">{patient.totalAppointments}</p>
            <p className="text-xs text-[var(--text-tertiary)]">Citas</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[var(--error)]">{patient.totalNoShows}</p>
            <p className="text-xs text-[var(--text-tertiary)]">No-shows</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {patient.totalAppointments && Number(patient.totalAppointments) > 0
                ? Math.round((Number(patient.totalNoShows ?? 0) / Number(patient.totalAppointments)) * 100)
                : 0}%
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">Tasa no-show</p>
          </div>
        </div>

        {/* Medical info */}
        {(patient.allergies || patient.chronicConditions || patient.insuranceProvider) && (
          <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-2">
            {patient.allergies && (
              <div className="flex items-start gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-[var(--error)] mt-0.5" />
                <div className="text-[var(--text-secondary)]"><span className="font-medium text-[var(--text-primary)]">Alergias:</span> {patient.allergies}</div>
              </div>
            )}
            {patient.chronicConditions && (
              <div className="flex items-start gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-[var(--warning)] mt-0.5" />
                <div className="text-[var(--text-secondary)]"><span className="font-medium text-[var(--text-primary)]">Condiciones crónicas:</span> {patient.chronicConditions}</div>
              </div>
            )}
            {patient.insuranceProvider && (
              <div className="flex items-start gap-2 text-sm">
                <Shield className="w-4 h-4 text-[var(--accent)] mt-0.5" />
                <div className="text-[var(--text-secondary)]"><span className="font-medium text-[var(--text-primary)]">Seguro:</span> {patient.insuranceProvider} {patient.insurancePolicy && `(${patient.insurancePolicy})`}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Appointment History */}
      <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-6 mb-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Historial de Citas
        </h2>
        {patientAppointments.length === 0 ? (
          <p className="text-[var(--text-tertiary)] text-sm">Sin citas registradas.</p>
        ) : (
          <div className="space-y-2">
            {patientAppointments.map((appt) => (
              <div key={appt.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                <div>
                  <span className="text-sm font-medium text-[var(--text-primary)]">{appt.date}</span>
                  <span className="text-sm text-[var(--text-tertiary)] ml-2 font-mono">{appt.startTime.slice(0, 5)}</span>
                  {appt.reason && <span className="text-sm text-[var(--text-secondary)] ml-3">{appt.reason}</span>}
                </div>
                <StatusBadge status={appt.status ?? 'scheduled'} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Clinical Notes */}
      {notes.length > 0 && (
        <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Notas Clínicas</h2>
          <div className="space-y-3">
            {notes.map((note) => (
              <div key={note.id} className="p-3 bg-[var(--bg-tertiary)] rounded-lg">
                <p className="text-xs text-[var(--text-tertiary)] mb-1">
                  {note.createdAt ? new Date(note.createdAt).toLocaleDateString('es-MX') : ''}
                </p>
                {note.assessment && <p className="text-sm text-[var(--text-secondary)]"><strong className="text-[var(--text-primary)]">Assessment:</strong> {note.assessment}</p>}
                {note.plan && <p className="text-sm text-[var(--text-secondary)]"><strong className="text-[var(--text-primary)]">Plan:</strong> {note.plan}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
