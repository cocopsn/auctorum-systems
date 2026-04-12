'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, CalendarCheck, DollarSign, HeartPulse, Users } from 'lucide-react'
import {
  AiInsightCard,
  DonutCard,
  KpiCard,
  LineChartCard,
  ProgressList,
  StatusBadge,
} from '@quote-engine/ui'

function formatMXN(amount: number | string) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(num)
}

export default function AgendaPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/agenda')
      if (!res.ok) throw new Error('Error al cargar agenda')
      const json = await res.json()
      setData(json)
    } catch (err: any) {
      setError(err?.message || 'Error al cargar agenda')
    }
    setLoading(false)
  }, [])

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
        <p className="text-sm text-red-600">{error || 'Error al cargar agenda'}</p>
      </div>
    )
  }

  const { tenantName, todayAppointments, activePatients, revenue, attendanceRate } = data

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <p className="text-sm font-medium text-indigo-600">{tenantName}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">Agenda clinica</h1>
        <p className="mt-2 text-sm text-gray-500">Vista diaria para pacientes, ingresos y recomendaciones del concierge.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Citas Hoy" value={todayAppointments.length} trend="+8%" icon={CalendarCheck} />
        <KpiCard title="Pacientes Activos" value={activePatients} trend="+12%" icon={Users} />
        <KpiCard title="Ingresos (MXN)" value={formatMXN(revenue)} trend="+6%" icon={DollarSign} />
        <KpiCard title="Tasa Asistencia" value={`${attendanceRate}%`} trend="+4%" icon={HeartPulse} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <LineChartCard title="Flujo de Pacientes" subtitle="Citas completadas vs canceladas" seriesA="Completadas" seriesB="Canceladas" />
        </div>
        <div className="xl:col-span-3">
          <DonutCard title="Distribucion de Citas" label="Asistencia" value={`${attendanceRate}%`} />
        </div>
        <div className="xl:col-span-2">
          <ProgressList
            title="Top Automations"
            items={[
              { label: 'Recordatorio 24h', value: '91%', meta: 'confirmaciones', progress: 91 },
              { label: 'Seguimiento post-consulta', value: '68%', meta: 'respuestas', progress: 68 },
            ]}
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm xl:col-span-2">
          <h2 className="text-base font-semibold text-gray-900">Proximas Citas</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Paciente</th>
                  <th className="px-4 py-3">Horario</th>
                  <th className="px-4 py-3">Motivo</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {todayAppointments.map((appointment: any) => (
                  <tr key={appointment.id}>
                    <td className="px-4 py-4 font-medium text-gray-900">{appointment.patientName}</td>
                    <td className="px-4 py-4 text-gray-500">{appointment.startTime}</td>
                    <td className="px-4 py-4 text-gray-500">{appointment.reason || 'Consulta'}</td>
                    <td className="px-4 py-4"><StatusBadge tone={appointment.status === 'completed' ? 'success' : 'neutral'}>{appointment.status || 'scheduled'}</StatusBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <AiInsightCard
          href="/ai-settings"
          insights={[
            { title: 'Confirmaciones pendientes', body: '3 pacientes requieren confirmacion para manana.' },
            { title: 'Hueco sugerido', body: 'Hay un bloque libre despues de las 13:00 que puede recibir seguimiento.' },
          ]}
        />
      </div>
    </div>
  )
}
