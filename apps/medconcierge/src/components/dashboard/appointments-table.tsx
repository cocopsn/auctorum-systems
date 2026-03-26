'use client'

import { useState, useEffect } from 'react'
import { Search, ChevronDown } from 'lucide-react'
import { StatusBadge } from './status-badge'

type AppointmentRow = {
  id: string
  date: string
  startTime: string
  endTime: string
  status: string | null
  reason: string | null
  consultationFee: string | null
  patientName: string
  patientPhone: string
  patientId: string
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'scheduled', label: 'Agendadas' },
  { value: 'confirmed', label: 'Confirmadas' },
  { value: 'completed', label: 'Completadas' },
  { value: 'no_show', label: 'No asistió' },
  { value: 'cancelled', label: 'Canceladas' },
]

export function AppointmentsTable() {
  const [rows, setRows] = useState<AppointmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const fetchData = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (dateFrom) params.set('startDate', dateFrom)
    if (dateTo) params.set('endDate', dateTo)
    if (statusFilter) params.set('status', statusFilter)
    if (search) params.set('search', search)

    fetch(`/api/dashboard/appointments?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setRows(data.appointments ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    fetchData()
  }, [statusFilter, dateFrom, dateTo])

  useEffect(() => {
    const timer = setTimeout(fetchData, 300)
    return () => clearTimeout(timer)
  }, [search])

  const updateStatus = async (appointmentId: string, status: string) => {
    await fetch('/api/dashboard/appointments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId, status }),
    })
    fetchData()
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar paciente..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-tenant-primary/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Fecha</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Hora</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Paciente</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Motivo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">Cargando...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">No hay citas.</td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3">{row.date}</td>
                    <td className="px-4 py-3">{row.startTime.slice(0, 5)}</td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{row.patientName}</p>
                        <p className="text-xs text-gray-400">{row.patientPhone}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{row.reason ?? '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status ?? 'scheduled'} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative group">
                        <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                          Cambiar <ChevronDown className="w-3 h-3" />
                        </button>
                        <div className="hidden group-hover:block absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[140px]">
                          {['confirmed', 'in_progress', 'completed', 'no_show', 'cancelled'].map((s) => (
                            <button
                              key={s}
                              onClick={() => updateStatus(row.id, s)}
                              className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-50"
                            >
                              <StatusBadge status={s} />
                            </button>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
