"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { ChevronLeft, ChevronRight, Clock, User, X, Plus, Loader2, Edit2, Trash2 } from "lucide-react"

type ViewMode = "week" | "day" | "month"
type AppointmentData = {
  id: string
  date: string
  startTime: string
  endTime: string
  status: string
  reason: string | null
  patientName: string
  patientPhone: string
  patientId: string
  confirmedByPatient: boolean
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  scheduled: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  confirmed: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  completed: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  cancelled: { bg: "bg-red-50", text: "text-red-400 line-through", border: "border-red-200" },
  no_show: { bg: "bg-gray-50", text: "text-gray-400", border: "border-gray-200" },
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}

function formatTime(t: string) {
  const parts = t.split(":")
  const hr = parseInt(parts[0])
  const min = parts[1]
  const ampm = hr >= 12 ? "PM" : "AM"
  const h12 = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr
  return `${h12}:${min} ${ampm}`
}

function getWeekDates(date: Date): Date[] {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  return Array.from({ length: 6 }, (_, i) => {
    const dd = new Date(monday)
    dd.setDate(monday.getDate() + i)
    return dd
  })
}

const HOURS = Array.from({ length: 25 }, (_, i) => 8 * 60 + i * 30).filter(m => m <= 20 * 60)
const DAY_NAMES = ["Lun", "Mar", "Mi\u00e9", "Jue", "Vie", "S\u00e1b"]
const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]

export function CalendarGrid() {
  const [view, setView] = useState<ViewMode>("week")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [appointments, setAppointments] = useState<AppointmentData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAppt, setSelectedAppt] = useState<AppointmentData | null>(null)
  const [showNewModal, setShowNewModal] = useState<{ date: string; time: string } | null>(null)
  const [editModal, setEditModal] = useState<AppointmentData | null>(null)
  const [saving, setSaving] = useState(false)

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate])

  const dateRange = useMemo(() => {
    if (view === "day") {
      const d = currentDate.toISOString().split("T")[0]
      return { start: d, end: d }
    }
    if (view === "month") {
      const y = currentDate.getFullYear()
      const m = currentDate.getMonth()
      const start = new Date(y, m, 1).toISOString().split("T")[0]
      const end = new Date(y, m + 1, 0).toISOString().split("T")[0]
      return { start, end }
    }
    return {
      start: weekDates[0].toISOString().split("T")[0],
      end: weekDates[5].toISOString().split("T")[0],
    }
  }, [view, currentDate, weekDates])

  const fetchAppointments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard/appointments?startDate=${dateRange.start}&endDate=${dateRange.end}&limit=200`)
      if (res.ok) {
        const json = await res.json()
        setAppointments(json.appointments || [])
      }
    } catch (e) {
      console.error("fetch error:", e)
    }
    setLoading(false)
  }, [dateRange])

  useEffect(() => { fetchAppointments() }, [fetchAppointments])

  function navigate(dir: number) {
    const d = new Date(currentDate)
    if (view === "day") d.setDate(d.getDate() + dir)
    else if (view === "week") d.setDate(d.getDate() + dir * 7)
    else d.setMonth(d.getMonth() + dir)
    setCurrentDate(d)
  }

  function goToday() { setCurrentDate(new Date()) }

  async function handleCancel(id: string) {
    if (!confirm("Cancelar esta cita?")) return
    setSaving(true)
    await fetch(`/api/dashboard/appointments/${id}/cancel`, { method: "DELETE" })
    setSelectedAppt(null)
    setSaving(false)
    fetchAppointments()
  }

  async function handleSaveEdit() {
    if (!editModal) return
    setSaving(true)
    await fetch(`/api/dashboard/appointments/${editModal.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: editModal.date,
        startTime: editModal.startTime,
        endTime: editModal.endTime,
        status: editModal.status,
        reason: editModal.reason,
      }),
    })
    setEditModal(null)
    setSaving(false)
    fetchAppointments()
  }

  async function handleNewAppointment(form: { patientName: string; date: string; time: string; reason: string }) {
    setSaving(true)
    await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientName: form.patientName,
        date: form.date,
        startTime: form.time + ":00",
        endTime: addMinutes(form.time, 30) + ":00",
        reason: form.reason,
      }),
    })
    setShowNewModal(null)
    setSaving(false)
    fetchAppointments()
  }

  function addMinutes(time: string, mins: number) {
    const [h, m] = time.split(":").map(Number)
    const total = h * 60 + m + mins
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`
  }

  const headerText = view === "day"
    ? currentDate.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : view === "month"
    ? `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    : `${weekDates[0].getDate()} - ${weekDates[5].getDate()} ${MONTH_NAMES[weekDates[0].getMonth()]} ${weekDates[0].getFullYear()}`

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition"><ChevronLeft className="w-5 h-5 text-gray-600" /></button>
          <button onClick={goToday} className="px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition">Hoy</button>
          <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition"><ChevronRight className="w-5 h-5 text-gray-600" /></button>
          <h2 className="text-lg font-semibold text-gray-900 capitalize">{headerText}</h2>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          {(["day", "week", "month"] as ViewMode[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${view === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {v === "day" ? "D\u00eda" : v === "week" ? "Semana" : "Mes"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-96"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
      ) : view === "month" ? (
        <MonthView appointments={appointments} currentDate={currentDate} onSelect={setSelectedAppt} />
      ) : (
        <div className="overflow-auto max-h-[calc(100vh-220px)]">
          <div className="grid sticky top-0 z-10 bg-white border-b border-gray-100" style={{ gridTemplateColumns: view === "day" ? "60px 1fr" : "60px repeat(6, 1fr)" }}>
            <div className="px-2 py-3" />
            {(view === "day" ? [currentDate] : weekDates).map((d, i) => {
              const dateStr = d.toISOString().split("T")[0]
              const isToday = dateStr === new Date().toISOString().split("T")[0]
              const dayAppts = appointments.filter(a => a.date === dateStr)
              return (
                <div key={i} className={`px-2 py-3 text-center border-l border-gray-50 ${isToday ? "bg-blue-50/50" : ""}`}>
                  <p className="text-xs text-gray-500">{view === "day" ? d.toLocaleDateString("es-MX", { weekday: "long" }) : DAY_NAMES[i]}</p>
                  <p className={`text-lg font-semibold ${isToday ? "text-blue-600" : "text-gray-900"}`}>{d.getDate()}</p>
                  {dayAppts.length > 0 && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700 mt-0.5">{dayAppts.length}</span>
                  )}
                </div>
              )
            })}
          </div>

          <div className="relative grid" style={{ gridTemplateColumns: view === "day" ? "60px 1fr" : "60px repeat(6, 1fr)" }}>
            <div>
              {HOURS.map(m => (
                <div key={m} className="h-10 flex items-start justify-end pr-2 -mt-2">
                  <span className="text-[10px] text-gray-400">{m % 60 === 0 ? formatTime(`${Math.floor(m/60)}:00`) : ""}</span>
                </div>
              ))}
            </div>

            {(view === "day" ? [currentDate] : weekDates).map((d, colIdx) => {
              const dateStr = d.toISOString().split("T")[0]
              const dayAppts = appointments.filter(a => a.date === dateStr)
              const isToday = dateStr === new Date().toISOString().split("T")[0]
              return (
                <div key={colIdx} className={`relative border-l border-gray-50 ${isToday ? "bg-blue-50/20" : ""}`}>
                  {HOURS.map(m => (
                    <div key={m} className="h-10 border-b border-gray-50 cursor-pointer hover:bg-gray-50/50 transition"
                      onClick={() => {
                        const time = `${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`
                        setShowNewModal({ date: dateStr, time })
                      }}
                    />
                  ))}
                  {dayAppts.map(appt => {
                    const startMin = timeToMinutes(appt.startTime)
                    const endMin = timeToMinutes(appt.endTime)
                    const top = ((startMin - 8 * 60) / 30) * 40
                    const height = Math.max(((endMin - startMin) / 30) * 40 - 2, 20)
                    const colors = STATUS_COLORS[appt.status] || STATUS_COLORS.scheduled
                    return (
                      <div key={appt.id} onClick={() => setSelectedAppt(appt)}
                        className={`absolute left-0.5 right-0.5 rounded-lg border ${colors.bg} ${colors.border} px-2 py-1 cursor-pointer hover:shadow-md transition-shadow overflow-hidden`}
                        style={{ top: `${top}px`, height: `${height}px` }}>
                        <p className={`text-[11px] font-medium ${colors.text} truncate`}>{appt.patientName}</p>
                        {height > 30 && <p className="text-[10px] text-gray-500 truncate">{formatTime(appt.startTime)} - {appt.reason || "Consulta"}</p>}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {selectedAppt && (
        <Modal onClose={() => setSelectedAppt(null)} title="Detalle de Cita">
          <div className="space-y-3">
            <div className="flex items-center gap-2"><User className="w-4 h-4 text-gray-400" /><span className="font-medium">{selectedAppt.patientName}</span></div>
            <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400" /><span>{selectedAppt.date} &mdash; {formatTime(selectedAppt.startTime)} a {formatTime(selectedAppt.endTime)}</span></div>
            <div><span className="text-sm text-gray-500">Motivo:</span> <span>{selectedAppt.reason || "Consulta general"}</span></div>
            <div><span className="text-sm text-gray-500">Estatus:</span> <StatusPill status={selectedAppt.status} /></div>
            <div className="flex gap-2 pt-3 border-t border-gray-100">
              <button onClick={() => { setEditModal(selectedAppt); setSelectedAppt(null) }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition">
                <Edit2 className="w-3.5 h-3.5" /> Editar
              </button>
              <button onClick={() => handleCancel(selectedAppt.id)} disabled={saving}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition">
                <Trash2 className="w-3.5 h-3.5" /> Cancelar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {editModal && (
        <Modal onClose={() => setEditModal(null)} title="Editar Cita">
          <div className="space-y-3">
            <label className="block"><span className="text-sm text-gray-600">Fecha</span>
              <input type="date" value={editModal.date} onChange={e => setEditModal({ ...editModal, date: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="text-sm text-gray-600">Hora inicio</span>
                <input type="time" value={editModal.startTime.slice(0,5)} onChange={e => setEditModal({ ...editModal, startTime: e.target.value + ":00" })}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" /></label>
              <label className="block"><span className="text-sm text-gray-600">Hora fin</span>
                <input type="time" value={editModal.endTime.slice(0,5)} onChange={e => setEditModal({ ...editModal, endTime: e.target.value + ":00" })}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" /></label>
            </div>
            <label className="block"><span className="text-sm text-gray-600">Estatus</span>
              <select value={editModal.status} onChange={e => setEditModal({ ...editModal, status: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                <option value="scheduled">Programada</option><option value="confirmed">Confirmada</option>
                <option value="completed">Completada</option><option value="cancelled">Cancelada</option>
              </select></label>
            <label className="block"><span className="text-sm text-gray-600">Motivo</span>
              <input type="text" value={editModal.reason || ""} onChange={e => setEditModal({ ...editModal, reason: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" /></label>
            <button onClick={handleSaveEdit} disabled={saving}
              className="w-full py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
              {saving ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </Modal>
      )}

      {showNewModal && (
        <NewAppointmentModal date={showNewModal.date} time={showNewModal.time} saving={saving}
          onClose={() => setShowNewModal(null)} onSave={handleNewAppointment} />
      )}
    </div>
  )
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.scheduled
  const labels: Record<string, string> = { scheduled: "Programada", confirmed: "Confirmada", completed: "Completada", cancelled: "Cancelada", no_show: "No asistio" }
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>{labels[status] || status}</span>
}

function NewAppointmentModal({ date, time, saving, onClose, onSave }: {
  date: string; time: string; saving: boolean; onClose: () => void
  onSave: (form: { patientName: string; date: string; time: string; reason: string }) => void
}) {
  const [form, setForm] = useState({ patientName: "", date, time, reason: "" })
  return (
    <Modal onClose={onClose} title="Agendar Cita">
      <div className="space-y-3">
        <label className="block"><span className="text-sm text-gray-600">Nombre del paciente</span>
          <input type="text" value={form.patientName} onChange={e => setForm({ ...form, patientName: e.target.value })}
            className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Juan Perez" /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="text-sm text-gray-600">Fecha</span>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
              className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" /></label>
          <label className="block"><span className="text-sm text-gray-600">Hora</span>
            <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })}
              className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" /></label>
        </div>
        <label className="block"><span className="text-sm text-gray-600">Motivo</span>
          <input type="text" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
            className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Consulta general" /></label>
        <button onClick={() => onSave(form)} disabled={!form.patientName || saving}
          className="w-full py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> {saving ? "Agendando..." : "Agendar Cita"}
        </button>
      </div>
    </Modal>
  )
}

function MonthView({ appointments, currentDate, onSelect }: { appointments: AppointmentData[]; currentDate: Date; onSelect: (a: AppointmentData) => void }) {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const offset = firstDay === 0 ? 6 : firstDay - 1

  const cells = Array.from({ length: 42 }, (_, i) => {
    const day = i - offset + 1
    if (day < 1 || day > daysInMonth) return null
    return day
  })

  return (
    <div className="p-4">
      <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-xl overflow-hidden">
        {["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"].map(d => (
          <div key={d} className="bg-gray-50 py-2 text-center text-xs font-medium text-gray-500">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="bg-white min-h-[80px]" />
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
          const dayAppts = appointments.filter(a => a.date === dateStr)
          const isToday = dateStr === new Date().toISOString().split("T")[0]
          return (
            <div key={i} className={`bg-white min-h-[80px] p-1.5 ${isToday ? "ring-2 ring-blue-200 ring-inset" : ""}`}>
              <p className={`text-xs font-medium mb-1 ${isToday ? "text-blue-600" : "text-gray-700"}`}>{day}</p>
              {dayAppts.slice(0, 3).map(a => (
                <button key={a.id} onClick={() => onSelect(a)}
                  className={`block w-full text-left text-[10px] px-1 py-0.5 rounded truncate mb-0.5 ${STATUS_COLORS[a.status]?.bg || "bg-gray-50"} ${STATUS_COLORS[a.status]?.text || "text-gray-700"}`}>
                  {a.startTime.slice(0,5)} {a.patientName.split(" ")[0]}
                </button>
              ))}
              {dayAppts.length > 3 && <p className="text-[10px] text-gray-400">+{dayAppts.length - 3} mas</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
