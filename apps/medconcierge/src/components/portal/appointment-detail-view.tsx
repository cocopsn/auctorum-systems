import Link from 'next/link'
import type { Appointment, ClinicalRecord } from '@quote-engine/db'
import { ArrowLeft, CalendarCheck, Clock, Stethoscope, Pill, ClipboardList } from 'lucide-react'

// ============================================================
// Appointment detail — read-only view for the patient portal.
// Shows date/time/status, diagnosis, prescription, and treatment
// plan from clinical notes. Does NOT show SOAP subjective/
// objective (doctor-internal observations).
// ============================================================

type Props = {
  appointment: Appointment
  note: ClinicalRecord | null
  tenantName: string
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

function formatDateLong(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function AppointmentDetailView({
  appointment,
  note,
  tenantName,
  slug,
  token,
}: Props) {
  const badge = STATUS_BADGE[appointment.status ?? 'scheduled'] ??
    { label: appointment.status, classes: 'bg-gray-100 text-gray-600' }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <Link
        href={`/${slug}/portal/${token}`}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a mi portal
      </Link>

      {/* Appointment header */}
      <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] capitalize">
              {formatDateLong(appointment.date)}
            </h1>
            <div className="flex items-center gap-2 mt-2 text-sm text-[var(--text-secondary)]">
              <Clock className="w-4 h-4" />
              <span className="font-mono font-medium">{appointment.startTime.slice(0, 5)} — {appointment.endTime.slice(0, 5)}</span>
            </div>
            <p className="text-sm text-[var(--text-tertiary)] mt-1">{tenantName}</p>
          </div>
          <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium ${badge.classes}`}>
            {badge.label}
          </span>
        </div>

        {appointment.reason && (
          <div className="mt-4 pt-4 border-t border-[var(--border)]">
            <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wide mb-1">Motivo de consulta</p>
            <p className="text-sm text-[var(--text-primary)]">{appointment.reason}</p>
          </div>
        )}
      </div>

      {/* Diagnosis */}
      {appointment.diagnosis && (
        <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-6">
          <div className="flex items-center gap-2 mb-3">
            <Stethoscope className="w-5 h-5 text-[var(--accent)]" />
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Diagnóstico</h2>
          </div>
          <p className="text-sm text-[var(--text-primary)] whitespace-pre-line">{appointment.diagnosis}</p>
        </div>
      )}

      {/* Prescription */}
      {appointment.prescription && (
        <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-6">
          <div className="flex items-center gap-2 mb-3">
            <Pill className="w-5 h-5 text-[var(--accent)]" />
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Receta</h2>
          </div>
          <p className="text-sm text-[var(--text-primary)] whitespace-pre-line">{appointment.prescription}</p>
        </div>
      )}

      {/* Clinical note — assessment + plan only (NOT subjective/objective) */}
      {note && (note.soapAssessment || note.soapPlan) && (
        <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-6">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="w-5 h-5 text-[var(--accent)]" />
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Plan de tratamiento</h2>
          </div>
          <div className="space-y-3">
            {note.soapAssessment && (
              <div>
                <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wide mb-1">Evaluación</p>
                <p className="text-sm text-[var(--text-primary)] whitespace-pre-line">{note.soapAssessment}</p>
              </div>
            )}
            {note.soapPlan && (
              <div>
                <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wide mb-1">Plan</p>
                <p className="text-sm text-[var(--text-primary)] whitespace-pre-line">{note.soapPlan}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment info for completed appointments */}
      {appointment.consultationFee && appointment.status === 'completed' && (
        <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--text-secondary)]">Consulta</p>
            <p className="text-base font-semibold text-[var(--text-primary)]">
              ${Number(appointment.consultationFee).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
