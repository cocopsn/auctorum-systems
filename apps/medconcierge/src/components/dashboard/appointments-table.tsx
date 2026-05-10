'use client'

import { useState, useEffect } from 'react'
import { Search, ChevronDown, Ban, CalendarClock, CreditCard, Loader2 } from 'lucide-react'
import { StatusBadge } from './status-badge'
import { CancelAppointmentDialog } from './cancel-appointment-dialog'
import { RescheduleAppointmentDialog } from './reschedule-appointment-dialog'

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

type CancelDialogState = {
  id: string
  patientName: string
  date: string
  startTime: string
}

type RescheduleDialogState = {
  id: string
  patientName: string
  currentDate: string
  currentStartTime: string
}

export function AppointmentsTable({ tenantId }: { tenantId: string }) {
  const [rows, setRows] = useState<AppointmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [cancelDialog, setCancelDialog] = useState<CancelDialogState | null>(null)
  const [rescheduleDialog, setRescheduleDialog] = useState<RescheduleDialogState | null>(null)

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

  const inputClass = 'px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30'

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar paciente..."
            className={`w-full pl-9 pr-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30`}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={inputClass}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputClass} />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputClass} />
      </div>

      {/* Table */}
      <div className="card-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-tertiary)]/40">
                <th className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-wide text-[var(--text-tertiary)]">Fecha</th>
                <th className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-wide text-[var(--text-tertiary)]">Hora</th>
                <th className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-wide text-[var(--text-tertiary)]">Paciente</th>
                <th className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-wide text-[var(--text-tertiary)]">Motivo</th>
                <th className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-wide text-[var(--text-tertiary)]">Status</th>
                <th className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-wide text-[var(--text-tertiary)]">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[var(--text-tertiary)]">Cargando...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[var(--text-tertiary)]">No hay citas.</td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="row-alt border-b border-[var(--border)] transition-colors">
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{row.date}</td>
                    <td className="px-4 py-3 font-mono text-[var(--text-secondary)]">{row.startTime.slice(0, 5)}</td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">{row.patientName}</p>
                        <p className="text-xs text-[var(--text-tertiary)]">{row.patientPhone}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] max-w-[200px] truncate">{row.reason ?? '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status ?? 'scheduled'} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="relative group">
                          <button className="flex items-center gap-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                            Cambiar <ChevronDown className="w-3 h-3" />
                          </button>
                          <div className="hidden group-hover:block absolute right-0 top-full mt-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg shadow-lg z-10 min-w-[140px]">
                            {['confirmed', 'in_progress', 'completed', 'no_show'].map((s) => (
                              <button
                                key={s}
                                onClick={() => updateStatus(row.id, s)}
                                className="block w-full text-left px-3 py-2 text-xs hover:bg-[var(--bg-tertiary)] transition-colors"
                              >
                                <StatusBadge status={s} />
                              </button>
                            ))}
                          </div>
                        </div>
                        {row.status !== 'cancelled' && row.status !== 'completed' && (
                          <>
                            <ChargeButton row={row} />
                            <button
                              type="button"
                              title="Reagendar"
                              onClick={() =>
                                setRescheduleDialog({
                                  id: row.id,
                                  patientName: row.patientName,
                                  currentDate: row.date,
                                  currentStartTime: row.startTime,
                                })
                              }
                              className="p-1.5 rounded-md text-[var(--text-tertiary)] hover:text-[var(--accent)] hover:bg-[var(--bg-tertiary)] transition-colors"
                            >
                              <CalendarClock className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              title="Cancelar cita"
                              onClick={() =>
                                setCancelDialog({
                                  id: row.id,
                                  patientName: row.patientName,
                                  date: row.date,
                                  startTime: row.startTime,
                                })
                              }
                              className="p-1.5 rounded-md text-[var(--text-tertiary)] hover:text-[var(--error)] hover:bg-[var(--bg-tertiary)] transition-colors"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {cancelDialog && (
        <CancelAppointmentDialog
          appointmentId={cancelDialog.id}
          patientName={cancelDialog.patientName}
          date={cancelDialog.date}
          startTime={cancelDialog.startTime}
          open={true}
          onClose={() => setCancelDialog(null)}
          onCancelled={fetchData}
        />
      )}

      {rescheduleDialog && (
        <RescheduleAppointmentDialog
          appointmentId={rescheduleDialog.id}
          tenantId={tenantId}
          patientName={rescheduleDialog.patientName}
          currentDate={rescheduleDialog.currentDate}
          currentStartTime={rescheduleDialog.currentStartTime}
          open={true}
          onClose={() => setRescheduleDialog(null)}
          onRescheduled={fetchData}
        />
      )}
    </div>
  )
}

// ─── Charge button (Stripe Connect) ───
// Generates a Checkout link for the appointment + sends it via WhatsApp.
// Hidden when the tenant has no active Connect account or no fee
// configured. Pre-2026-05-10 the button rendered unconditionally and
// clicking on a no-Connect tenant produced a scary error after the
// confirm() dialog. Now we lazy-check Connect status once per page
// view (cached in module scope), and skip rendering when:
//   - row.consultationFee is missing/zero, OR
//   - the tenant's Stripe Connect status is anything other than 'active'.
let _connectStatusCache: { active: boolean; fetchedAt: number } | null = null
const CONNECT_CACHE_MS = 5 * 60 * 1000

function ChargeButton({ row }: { row: AppointmentRow }) {
  const [busy, setBusy] = useState(false)
  const [connectActive, setConnectActive] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    const cached = _connectStatusCache
    if (cached && Date.now() - cached.fetchedAt < CONNECT_CACHE_MS) {
      setConnectActive(cached.active)
      return
    }
    fetch('/api/dashboard/billing/connect/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return
        const active = d?.status === 'active' || d?.charges_enabled === true
        _connectStatusCache = { active, fetchedAt: Date.now() }
        setConnectActive(active)
      })
      .catch(() => !cancelled && setConnectActive(false))
    return () => { cancelled = true }
  }, [])

  // Hide entirely when fee is missing or Connect isn't onboarded.
  const fee = parseFloat(row.consultationFee ?? '0')
  if (!fee || fee < 10) return null
  if (connectActive === false) return null

  async function handleCharge() {
    if (!fee || fee < 10) {
      alert('Configura el costo de consulta primero (mínimo $10 MXN).')
      return
    }
    if (!confirm(
      `¿Enviar link de pago de $${fee.toFixed(0)} MXN a ${row.patientName} por WhatsApp?`,
    )) return

    setBusy(true)
    try {
      const res = await fetch('/api/dashboard/patient-payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(fee * 100),
          description: `Consulta — ${row.reason || 'Cita médica'}`,
          patientName: row.patientName,
          patientPhone: row.patientPhone,
          appointmentId: row.id,
          patientId: row.patientId,
          sendWhatsApp: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'No se pudo crear el link de pago')
        return
      }
      if (data.sentViaWhatsApp) {
        alert(`✅ Link enviado a ${row.patientName} por WhatsApp.`)
      } else {
        alert(`Link creado, pero no se envió por WhatsApp. URL:\n${data.checkoutUrl}`)
      }
    } catch (err) {
      alert('Error de red.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      title="Enviar cobro por WhatsApp"
      onClick={handleCharge}
      disabled={busy}
      className="p-1.5 rounded-md text-[var(--text-tertiary)] hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50"
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
    </button>
  )
}
