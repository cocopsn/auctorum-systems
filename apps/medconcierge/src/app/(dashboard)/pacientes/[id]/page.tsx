'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, User, Phone, Mail, Calendar } from 'lucide-react'
import { StatusBadge } from '@/components/dashboard/status-badge'
import PatientDetailClient from '@/components/patients/PatientDetailClient'
import PatientNotesSection from '@/components/patients/PatientNotesSection'

export default function PatientDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/dashboard/pacientes/${id}`)
      if (res.status === 404) throw new Error('Paciente no encontrado')
      if (!res.ok) throw new Error('Error al cargar paciente')
      const json = await res.json()
      setData(json)
    } catch (err: any) {
      setError(err?.message || 'Error al cargar paciente')
    }
    setLoading(false)
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-sm text-red-600">{error || 'Error al cargar paciente'}</p>
      </div>
    )
  }

  const { patient, files, appointments: patientAppointments } = data

  return (
    <div>
      <div className="mb-6">
        <a href="/pacientes" className="text-sm text-[var(--text-tertiary)] hover:text-[var(--accent)]">
          &larr; Volver a pacientes
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
      </div>

      {/* Editable clinical records + file attachments */}
      <PatientDetailClient patient={patient} files={files} />

      {/* Patient Notes (Expedientes Clínicos) */}
      <PatientNotesSection patientId={id} />

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
            {patientAppointments.map((appt: any) => (
              <div key={appt.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                <div>
                  <span className="text-sm font-medium text-[var(--text-primary)]">{appt.date}</span>
                  <span className="text-sm text-[var(--text-tertiary)] ml-2 font-mono">{appt.startTime?.slice(0, 5)}</span>
                  {appt.reason && <span className="text-sm text-[var(--text-secondary)] ml-3">{appt.reason}</span>}
                </div>
                <StatusBadge status={appt.status ?? 'scheduled'} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
