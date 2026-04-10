import Link from 'next/link'
import type { Patient, Appointment, PatientFile } from '@quote-engine/db'
import {
  CalendarPlus, CalendarCheck, Clock, FileText, Pill,
  Heart, AlertTriangle, Shield, ClipboardList,
} from 'lucide-react'
import { PortalFileDownload } from './portal-file-download'

// ============================================================
// Patient portal — main view (server component).
// Read-only overview of upcoming/past appointments, medical
// summary, prescriptions, treatment plans, and file attachments.
// ============================================================

type Prescription = {
  id: string
  date: string
  prescription: string
  diagnosis: string | null
}

type NotePlan = {
  id: string
  date: string
  plan: string
  assessment: string | null
}

type Props = {
  patient: Patient
  tenantName: string
  upcoming: Appointment[]
  past: Appointment[]
  prescriptions: Prescription[]
  notePlans: NotePlan[]
  files: PatientFile[]
  slug: string
  token: string
}

const STATUS_BADGE: Record<string, { label: string; classes: string }> = {
  scheduled: { label: 'Programada', classes: 'bg-blue-100 text-blue-700' },
  confirmed: { label: 'Confirmada', classes: 'bg-green-100 text-green-700' },
  in_progress: { label: 'En curso', classes: 'bg-yellow-100 text-yellow-700' },
  completed: { label: 'Completada', classes: 'bg-gray-100 text-gray-600' },
  cancelled: { label: 'Cancelada', classes: 'bg-red-100 text-red-600' },
  no_show: { label: 'No asistió', classes: 'bg-orange-100 text-orange-700' },
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateLong(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTimestamp(ts: Date | string | null): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function StatusBadge({ status }: { status: string }) {
  const badge = STATUS_BADGE[status] ?? { label: status, classes: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${badge.classes}`}>
      {badge.label}
    </span>
  )
}

export function PatientPortalView({
  patient,
  tenantName,
  upcoming,
  past,
  prescriptions,
  notePlans,
  files,
  slug,
  token,
}: Props) {
  const hasMedicalInfo =
    patient.allergies || patient.medications || patient.chronicConditions ||
    patient.bloodType || patient.insuranceProvider

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Hola, {patient.name.split(' ')[0]}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Portal de paciente — {tenantName}
          </p>
        </div>
        <Link
          href={`/${slug}/agendar`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white text-sm font-medium rounded-lg hover:bg-[var(--accent-hover)] transition-colors shrink-0"
        >
          <CalendarPlus className="w-4 h-4" />
          Agendar nueva cita
        </Link>
      </div>

      {/* Upcoming appointments */}
      <Section title="Próximas citas" icon={<CalendarCheck className="w-5 h-5" />}>
        {upcoming.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)]">Sin citas próximas.</p>
        ) : (
          <div className="space-y-3">
            {upcoming.map(appt => (
              <Link
                key={appt.id}
                href={`/${slug}/portal/${token}/cita/${appt.id}`}
                className="block p-4 bg-[var(--bg-tertiary)] rounded-lg hover:ring-2 hover:ring-[var(--accent)]/30 transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)] capitalize">
                      {formatDateLong(appt.date)}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 text-sm text-[var(--text-secondary)]">
                      <Clock className="w-3.5 h-3.5" />
                      {appt.startTime.slice(0, 5)}
                    </div>
                    {appt.reason && (
                      <p className="text-xs text-[var(--text-tertiary)] mt-1">{appt.reason}</p>
                    )}
                  </div>
                  <StatusBadge status={appt.status ?? 'scheduled'} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>

      {/* Medical summary */}
      {hasMedicalInfo && (
        <Section title="Información médica" icon={<Heart className="w-5 h-5" />}>
          <div className="space-y-3">
            {patient.allergies && (
              <InfoRow icon={<AlertTriangle className="w-4 h-4 text-[var(--error)]" />} label="Alergias" value={patient.allergies} />
            )}
            {patient.medications && (
              <InfoRow icon={<Pill className="w-4 h-4 text-[var(--accent)]" />} label="Medicamentos" value={patient.medications} />
            )}
            {patient.chronicConditions && (
              <InfoRow icon={<AlertTriangle className="w-4 h-4 text-[var(--warning)]" />} label="Condiciones crónicas" value={patient.chronicConditions} />
            )}
            {patient.bloodType && (
              <InfoRow icon={<Heart className="w-4 h-4 text-[var(--error)]" />} label="Tipo de sangre" value={patient.bloodType} />
            )}
            {patient.insuranceProvider && (
              <InfoRow
                icon={<Shield className="w-4 h-4 text-[var(--accent)]" />}
                label="Seguro"
                value={`${patient.insuranceProvider}${patient.insurancePolicy ? ` (${patient.insurancePolicy})` : ''}`}
              />
            )}
          </div>
        </Section>
      )}

      {/* Prescriptions + treatment plans */}
      {(prescriptions.length > 0 || notePlans.length > 0) && (
        <Section title="Recetas y planes de tratamiento" icon={<ClipboardList className="w-5 h-5" />}>
          <div className="space-y-4">
            {prescriptions.map(rx => (
              <div key={`rx-${rx.id}`} className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
                <p className="text-xs text-[var(--text-tertiary)] mb-1">{formatDate(rx.date)}</p>
                {rx.diagnosis && (
                  <p className="text-sm text-[var(--text-secondary)] mb-2">
                    <strong className="text-[var(--text-primary)]">Diagnóstico:</strong> {rx.diagnosis}
                  </p>
                )}
                <p className="text-sm text-[var(--text-primary)] whitespace-pre-line">{rx.prescription}</p>
              </div>
            ))}
            {notePlans.map(np => (
              <div key={`np-${np.id}`} className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
                <p className="text-xs text-[var(--text-tertiary)] mb-1">{np.date ? formatDate(np.date) : '—'}</p>
                {np.assessment && (
                  <p className="text-sm text-[var(--text-secondary)] mb-2">
                    <strong className="text-[var(--text-primary)]">Evaluación:</strong> {np.assessment}
                  </p>
                )}
                <p className="text-sm text-[var(--text-primary)] whitespace-pre-line">{np.plan}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Past appointments */}
      <Section title="Historial de citas" icon={<CalendarCheck className="w-5 h-5" />}>
        {past.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)]">Sin citas anteriores.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--border)]">
                <tr className="text-[var(--text-tertiary)] text-[11px] uppercase tracking-wide">
                  <th className="text-left px-3 py-2">Fecha</th>
                  <th className="text-left px-3 py-2">Hora</th>
                  <th className="text-left px-3 py-2 hidden sm:table-cell">Motivo</th>
                  <th className="text-left px-3 py-2">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {past.map(appt => (
                  <tr key={appt.id} className="hover:bg-[var(--bg-tertiary)] transition-colors">
                    <td className="px-3 py-2">
                      <Link
                        href={`/${slug}/portal/${token}/cita/${appt.id}`}
                        className="text-[var(--text-primary)] hover:text-[var(--accent)]"
                      >
                        {formatDate(appt.date)}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-[var(--text-secondary)] font-mono">
                      {appt.startTime.slice(0, 5)}
                    </td>
                    <td className="px-3 py-2 text-[var(--text-tertiary)] hidden sm:table-cell">
                      {appt.reason || '—'}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={appt.status ?? 'scheduled'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Files */}
      {files.length > 0 && (
        <Section title="Documentos" icon={<FileText className="w-5 h-5" />}>
          <div className="space-y-2">
            {files.map(file => (
              <div key={file.id} className="flex items-center justify-between gap-3 py-2 border-b border-[var(--border)] last:border-0">
                <div className="min-w-0">
                  <PortalFileDownload
                    token={token}
                    fileId={file.id}
                    filename={file.filename}
                  />
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                    {formatSize(file.sizeBytes)} · {formatTimestamp(file.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[var(--accent)]">{icon}</span>
        <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>
        <span className="font-medium text-[var(--text-primary)]">{label}:</span>{' '}
        <span className="text-[var(--text-secondary)]">{value}</span>
      </div>
    </div>
  )
}
