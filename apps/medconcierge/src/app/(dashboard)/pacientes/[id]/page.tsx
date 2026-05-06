"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Loader2, Phone, Mail, Calendar, FileText, Stethoscope, User, ClipboardList, FileSignature } from "lucide-react"
import { StatusBadge } from "@/components/dashboard/status-badge"
import PatientDetailClient from "@/components/patients/PatientDetailClient"
import PatientExpediente from "@/components/clinical/PatientExpediente"
import { PatientAvatar } from "@/components/patients/PatientAvatar"

type Tab = "expedientes" | "perfil" | "citas"

export default function PatientDetailPage() {
  const params = useParams()
  const id = (params?.id ?? '') as string

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>("expedientes")

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/dashboard/patients/${id}`)
      if (res.status === 404) throw new Error("Paciente no encontrado")
      if (!res.ok) throw new Error("Error al cargar paciente")
      const json = await res.json()
      setData(json)
    } catch (err: any) {
      setError(err?.message || "Error al cargar paciente")
    }
    setLoading(false)
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-sm text-red-600">{error || "Error al cargar paciente"}</p>
      </div>
    )
  }

  const { patient, files, appointments: patientAppointments } = data

  const tabs: { key: Tab; label: string; icon: typeof FileText }[] = [
    { key: "expedientes", label: "Expedientes", icon: Stethoscope },
    { key: "perfil", label: "Perfil", icon: User },
    { key: "citas", label: "Citas", icon: Calendar },
  ]

  return (
    <div>
      <div className="mb-4">
        <a href="/pacientes" className="text-sm text-[var(--text-tertiary)] hover:text-[var(--accent)]">
          &larr; Volver a pacientes
        </a>
      </div>

      {/* Patient Header */}
      <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-6 mb-4">
        <div className="flex items-start gap-4">
          <PatientAvatar
            patientId={id}
            currentAvatarUrl={patient.avatarUrl}
            name={patient.name}
            size="lg"
            editable
            onUpload={() => fetchData()}
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">{patient.name}</h1>
            <div className="flex flex-wrap gap-3 mt-1.5 text-sm text-[var(--text-secondary)]">
              <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{patient.phone}</span>
              {patient.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{patient.email}</span>}
              {patient.gender && <span className="px-2 py-0.5 bg-[var(--bg-tertiary)] rounded-full text-xs">{patient.gender}</span>}
              {patient.bloodType && <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded-full text-xs font-medium">Tipo {patient.bloodType}</span>}
              {patient.dateOfBirth && <span className="text-xs text-[var(--text-tertiary)]">Nac. {patient.dateOfBirth}</span>}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="flex items-center gap-4 text-center">
              <div>
                <p className="text-lg font-bold text-[var(--text-primary)]">{patient.totalAppointments ?? 0}</p>
                <p className="text-[10px] text-[var(--text-tertiary)]">Citas</p>
              </div>
              <div>
                <p className="text-lg font-bold text-[var(--text-primary)]">${Number(patient.totalSpent ?? 0).toLocaleString()}</p>
                <p className="text-[10px] text-[var(--text-tertiary)]">Total</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick links — NOM-004 */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-[var(--border)]">
          <Link
            href={`/pacientes/${id}/historia-clinica`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 text-xs font-medium transition-colors"
          >
            <ClipboardList className="w-3.5 h-3.5" />
            Historia clínica NOM-004
          </Link>
          <Link
            href={`/pacientes/${id}/consentimiento`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs font-medium transition-colors"
          >
            <FileSignature className="w-3.5 h-3.5" />
            Consentimientos informados
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border)] shadow-sm"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "expedientes" && (
        <PatientExpediente patientId={id} patientName={patient.name} />
      )}

      {activeTab === "perfil" && (
        <PatientDetailClient patient={patient} files={files} />
      )}

      {activeTab === "citas" && (
        <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-6">
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
                  <StatusBadge status={appt.status ?? "scheduled"} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
