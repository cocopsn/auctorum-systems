'use client'

import { useState, useEffect, useCallback } from 'react'
import { CalendarDays, List, QrCode, Plus, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { AppointmentsTable } from '@/components/dashboard/appointments-table'

type ViewMode = 'list' | 'calendar' | 'qr'

type AppointmentRow = {
  id: string
  date: string
  startTime: string
  endTime: string
  status: string | null
  reason: string | null
  patientName: string
  patientPhone: string
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  confirmed: 'bg-green-100 text-green-700 border-green-200',
  completed: 'bg-gray-100 text-gray-600 border-gray-200',
  in_progress: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  no_show: 'bg-red-100 text-red-700 border-red-200',
  cancelled: 'bg-gray-100 text-gray-400 border-gray-200',
}

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function getWeekDates(baseDate: Date): Date[] {
  const d = new Date(baseDate)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  const dates: Date[] = []
  for (let i = 0; i < 7; i++) {
    const dt = new Date(monday)
    dt.setDate(monday.getDate() + i)
    dates.push(dt)
  }
  return dates
}

function toLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return y + '-' + m + '-' + dd
}

function formatWeekLabel(dates: Date[]): string {
  const first = dates[0]
  const last = dates[6]
  const fmtFirst = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(first)
  const fmtLast = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(last)
  return `${fmtFirst} — ${fmtLast}`
}

function NewAppointmentModal({ onClose, onCreated, prefillDate }: { onClose: () => void; onCreated: () => void; prefillDate?: string }) {
  const [form, setForm] = useState({
    patientName: '',
    patientPhone: '',
    date: prefillDate || toLocalDate(new Date()),
    startTime: '09:00',
    reason: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName: form.patientName,
          patientPhone: form.patientPhone,
          date: form.date,
          time: form.startTime,
          reason: form.reason,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Error al crear cita')
        setSaving(false)
        return
      }
      onCreated()
      onClose()
    } catch {
      setError('Error de conexión')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Nueva cita</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="h-5 w-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Paciente</label>
            <input
              type="text"
              required
              value={form.patientName}
              onChange={e => setForm(f => ({ ...f, patientName: e.target.value }))}
              placeholder="Nombre completo"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
            <input
              type="tel"
              required
              value={form.patientPhone}
              onChange={e => setForm(f => ({ ...f, patientPhone: e.target.value }))}
              placeholder="844 123 4567"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <input
                type="date"
                required
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
              <input
                type="time"
                required
                value={form.startTime}
                onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
            <input
              type="text"
              value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="Consulta general, seguimiento, etc."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Creando...' : 'Agendar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CalendarView({ tenantId, onNewAppointment }: { tenantId: string; onNewAppointment: (date: string) => void }) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [appointments, setAppointments] = useState<AppointmentRow[]>([])
  const [loading, setLoading] = useState(true)

  const baseDate = new Date()
  baseDate.setDate(baseDate.getDate() + weekOffset * 7)
  const weekDates = getWeekDates(baseDate)

  const startDate = toLocalDate(weekDates[0])
  const endDate = toLocalDate(weekDates[6])

  const fetchAppointments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard/appointments?startDate=${startDate}&endDate=${endDate}`)
      if (res.ok) {
        const data = await res.json()
        setAppointments(data.appointments || [])
      }
    } catch {}
    setLoading(false)
  }, [startDate, endDate])

  useEffect(() => { fetchAppointments() }, [fetchAppointments])

  const appointmentsByDate: Record<string, AppointmentRow[]> = {}
  for (const apt of appointments) {
    if (!appointmentsByDate[apt.date]) appointmentsByDate[apt.date] = []
    appointmentsByDate[apt.date].push(apt)
  }

  const today = toLocalDate(new Date())

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setWeekOffset(w => w - 1)} className="p-2 rounded-lg hover:bg-gray-100">
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-900">{formatWeekLabel(weekDates)}</p>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} className="text-xs text-indigo-600 hover:underline mt-0.5">Hoy</button>
          )}
        </div>
        <button onClick={() => setWeekOffset(w => w + 1)} className="p-2 rounded-lg hover:bg-gray-100">
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekDates.map((date, i) => {
          const dateStr = toLocalDate(date)
          const isToday = dateStr === today
          const dayAppts = appointmentsByDate[dateStr] || []

          return (
            <div
              key={dateStr}
              className={`min-h-[140px] rounded-xl border p-2 cursor-pointer transition-colors ${
                isToday ? 'border-indigo-300 bg-indigo-50/50' : 'border-gray-100 bg-white hover:bg-gray-50'
              }`}
              onClick={() => onNewAppointment(dateStr)}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium text-gray-500">{DAY_NAMES[i]}</span>
                <span className={`text-sm font-semibold ${isToday ? 'text-indigo-600' : 'text-gray-900'}`}>
                  {date.getDate()}
                </span>
              </div>
              {loading ? (
                <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
              ) : (
                <div className="space-y-1">
                  {dayAppts.slice(0, 4).map(apt => (
                    <div
                      key={apt.id}
                      className={`text-[10px] px-1.5 py-0.5 rounded border truncate ${STATUS_COLORS[apt.status || 'scheduled']}`}
                      title={`${apt.startTime.slice(0, 5)} - ${apt.patientName}`}
                    >
                      <span className="font-mono">{apt.startTime.slice(0, 5)}</span>{' '}
                      {apt.patientName.split(' ')[0]}
                    </div>
                  ))}
                  {dayAppts.length > 4 && (
                    <p className="text-[10px] text-gray-400 text-center">+{dayAppts.length - 4} más</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function CitasClient({ tenantId }: { tenantId: string }) {
  const [view, setView] = useState<ViewMode>('list')
  const [showNewModal, setShowNewModal] = useState(false)
  const [prefillDate, setPrefillDate] = useState<string | undefined>()
  const [refreshKey, setRefreshKey] = useState(0)

  function handleNewFromCalendar(date: string) {
    setPrefillDate(date)
    setShowNewModal(true)
  }

  function handleCreated() {
    setRefreshKey(k => k + 1)
  }

  const viewButtons: { key: ViewMode; label: string; icon: any }[] = [
    { key: 'list', label: 'Lista', icon: List },
    { key: 'calendar', label: 'Calendario', icon: CalendarDays },
    { key: 'qr', label: 'QR Check-in', icon: QrCode },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Agenda</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestiona todas las citas del consultorio</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {viewButtons.map(v => {
              const Icon = v.icon
              return (
                <button
                  key={v.key}
                  onClick={() => setView(v.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    view === v.key
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {v.label}
                </button>
              )
            })}
          </div>
          <button
            onClick={() => { setPrefillDate(undefined); setShowNewModal(true) }}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nueva cita
          </button>
        </div>
      </div>

      {view === 'list' && (
        <div key={refreshKey}>
          <AppointmentsTable tenantId={tenantId} />
        </div>
      )}

      {view === 'calendar' && (
        <CalendarView tenantId={tenantId} onNewAppointment={handleNewFromCalendar} />
      )}

      {view === 'qr' && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <QrCode className="h-7 w-7 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-900 mb-1">QR Check-in</p>
          <p className="text-xs text-gray-500 max-w-sm">
            Genera códigos QR únicos por cita para que los pacientes confirmen su llegada escaneando al entrar. Disponible próximamente.
          </p>
        </div>
      )}

      {showNewModal && (
        <NewAppointmentModal
          onClose={() => setShowNewModal(false)}
          onCreated={handleCreated}
          prefillDate={prefillDate}
        />
      )}
    </div>
  )
}
