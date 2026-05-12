'use client'

import { useEffect, useMemo, useState } from 'react'
import { Calendar, CheckCircle2, Download, FileText, Loader2, TrendingUp, UserPlus, XCircle } from 'lucide-react'
import { UpgradePrompt } from '@/components/upgrade-prompt'
import { usePlanGate } from '@/hooks/use-plan-gate'

type Summary = {
  period: { from: string; to: string; days: number }
  appointments: {
    total: number
    completed: number
    cancelled: number
    noShow: number
    scheduled: number
    confirmed: number
    completionRate: number
  }
  patients: { new: number }
  revenue: { total: number; fees: number; net: number; payments: number; avgPerDay: number }
}

type RevenuePoint = { date: string; amount: number; count: number }
type StatusRow = { status: string; count: number }
type WeekdayRow = { weekday: number; count: number }

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  scheduled: { label: 'Agendadas',   color: '#94a3b8' },
  confirmed: { label: 'Confirmadas', color: '#0891b2' },
  completed: { label: 'Completadas', color: '#16a34a' },
  cancelled: { label: 'Canceladas',  color: '#dc2626' },
  no_show:   { label: 'No-show',     color: '#f59e0b' },
}

const WEEKDAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const PRESETS = [
  { label: 'Esta semana',     id: 'week'   },
  { label: 'Este mes',        id: 'month'  },
  { label: 'Mes anterior',    id: 'last'   },
  { label: '3 meses',         id: '3m'     },
  { label: 'Personalizado',   id: 'custom' },
] as const

function presetToRange(id: string): { from: string; to: string } {
  const today = new Date()
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  switch (id) {
    case 'week': {
      const from = new Date(today)
      from.setDate(from.getDate() - 6)
      return { from: fmt(from), to: fmt(today) }
    }
    case 'last': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const end   = new Date(today.getFullYear(), today.getMonth(), 0)
      return { from: fmt(start), to: fmt(end) }
    }
    case '3m': {
      const from = new Date(today)
      from.setMonth(from.getMonth() - 3)
      return { from: fmt(from), to: fmt(today) }
    }
    case 'month':
    default: {
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      return { from: fmt(start), to: fmt(today) }
    }
  }
}

export default function ReportesPage() {
  const initial = presetToRange('month')
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const [preset, setPreset] = useState<string>('month')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [revenue, setRevenue] = useState<RevenuePoint[]>([])
  const [statusRows, setStatusRows] = useState<StatusRow[]>([])
  const [weekdayRows, setWeekdayRows] = useState<WeekdayRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exportOpen, setExportOpen] = useState(false)
  // Plan gate — reports/export returns 402 for basico (reports_export).
  // The original UI used <a href> for direct downloads which bypassed
  // 402 handling. We now intercept via fetchWithPlanGate and trigger
  // the download via a blob URL once the response is OK.
  const { blockedFeature, clearBlock, fetchWithPlanGate } = usePlanGate()
  const [exportingType, setExportingType] = useState<string | null>(null)

  async function downloadExport(type: 'appointments' | 'payments' | 'patients') {
    setExportingType(type)
    setExportOpen(false)
    try {
      const res = await fetchWithPlanGate(
        `/api/dashboard/reports/export?type=${type}&from=${from}&to=${to}`,
      )
      if (!res) return // 402 → UpgradePrompt shown
      if (!res.ok) {
        setError('No se pudo generar el reporte.')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}-${from}-${to}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('export error:', err)
      setError('No se pudo generar el reporte.')
    } finally {
      setExportingType(null)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true); setError('')
      try {
        const qs = `from=${from}&to=${to}`
        const [s, r, a] = await Promise.all([
          fetch(`/api/dashboard/reports?${qs}`).then((res) => res.json()),
          fetch(`/api/dashboard/reports/revenue?${qs}`).then((res) => res.json()),
          fetch(`/api/dashboard/reports/appointments?${qs}`).then((res) => res.json()),
        ])
        if (cancelled) return
        if (s?.error) throw new Error(s.error)
        setSummary(s)
        setRevenue(Array.isArray(r?.data) ? r.data : [])
        setStatusRows(Array.isArray(a?.byStatus) ? a.byStatus : [])
        setWeekdayRows(Array.isArray(a?.byWeekday) ? a.byWeekday : [])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error cargando reportes')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [from, to])

  function applyPreset(id: string) {
    setPreset(id)
    if (id !== 'custom') {
      const r = presetToRange(id)
      setFrom(r.from); setTo(r.to)
    }
  }

  const peakWeekday = useMemo(() => {
    if (weekdayRows.length === 0) return null
    const top = [...weekdayRows].sort((a, b) => Number(b.count) - Number(a.count))[0]
    return WEEKDAY_LABELS[Number(top.weekday)]
  }, [weekdayRows])

  return (
    <div className="p-6 space-y-6">
      {blockedFeature && (
        <UpgradePrompt feature={blockedFeature} onClose={clearBlock} />
      )}
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
        <p className="text-sm text-gray-500">
          Métricas, ingresos y export contable. Período: <strong>{from}</strong> → <strong>{to}</strong>
        </p>
      </div>

      {/* Period selector + export */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                preset === p.id
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {preset === 'custom' && (
          <div className="flex items-center gap-2 text-xs">
            <label className="text-gray-500">Desde</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="border rounded px-2 py-1.5 text-xs"
            />
            <label className="text-gray-500">Hasta</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="border rounded px-2 py-1.5 text-xs"
            />
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <a
            href={`/reportes/print?from=${from}&to=${to}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            <FileText className="w-4 h-4" /> Imprimir / PDF
          </a>
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              <Download className="w-4 h-4" /> Descargar CSV
            </button>
            {exportOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-30 overflow-hidden">
                {(['appointments', 'payments', 'patients'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => downloadExport(t)}
                    disabled={exportingType !== null}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 border-b last:border-0 flex items-center gap-2 disabled:opacity-50"
                  >
                    {exportingType === t ? (
                      <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-gray-400" />
                    )}
                    {t === 'appointments' ? 'Citas' : t === 'payments' ? 'Pagos' : 'Pacientes'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{error}</div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          icon={<Calendar className="w-4 h-4" />}
          label="Citas total"
          value={summary?.appointments.total ?? '—'}
          color="bg-blue-50 text-blue-700"
          loading={loading}
        />
        <KpiCard
          icon={<CheckCircle2 className="w-4 h-4" />}
          label="Completadas"
          value={summary ? `${summary.appointments.completed} (${summary.appointments.completionRate}%)` : '—'}
          color="bg-emerald-50 text-emerald-700"
          loading={loading}
        />
        <KpiCard
          icon={<XCircle className="w-4 h-4" />}
          label="Canceladas"
          value={summary?.appointments.cancelled ?? '—'}
          color="bg-rose-50 text-rose-700"
          loading={loading}
        />
        <KpiCard
          icon={<XCircle className="w-4 h-4" />}
          label="No-show"
          value={summary?.appointments.noShow ?? '—'}
          color="bg-amber-50 text-amber-700"
          loading={loading}
        />
        <KpiCard
          icon={<UserPlus className="w-4 h-4" />}
          label="Nuevos pacientes"
          value={summary?.patients.new ?? '—'}
          color="bg-violet-50 text-violet-700"
          loading={loading}
        />
        <KpiCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="Revenue"
          value={summary ? mxn(summary.revenue.total) : '—'}
          subValue={summary ? `${summary.revenue.payments} pagos` : ''}
          color="bg-teal-50 text-teal-700"
          loading={loading}
        />
      </div>

      {/* Revenue chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Ingresos por día</h2>
          {summary && (
            <span className="text-xs text-gray-500">
              Promedio diario: <strong>{mxn(summary.revenue.avgPerDay)}</strong>
            </span>
          )}
        </div>
        <RevenueChart data={revenue} loading={loading} />
      </div>

      {/* Two-column charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Citas por status</h2>
          <StatusBars rows={statusRows} loading={loading} />
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Citas por día de la semana</h2>
          {peakWeekday && (
            <p className="text-xs text-gray-500 mb-3">
              Día más activo: <strong>{peakWeekday}</strong>
            </p>
          )}
          <WeekdayBars rows={weekdayRows} loading={loading} />
        </div>
      </div>
    </div>
  )
}

/* ---------- helpers + components ---------- */

function mxn(centavos: number): string {
  const pesos = (centavos ?? 0) / 100
  return pesos.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
}

function KpiCard({
  icon, label, value, subValue, color, loading,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  subValue?: string
  color: string
  loading?: boolean
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <div className={`inline-flex items-center justify-center rounded-md p-1.5 ${color}`}>{icon}</div>
      <div className="mt-2 text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-0.5 text-lg font-semibold text-gray-900">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : value}
      </div>
      {subValue && <div className="text-xs text-gray-400">{subValue}</div>}
    </div>
  )
}

function RevenueChart({ data, loading }: { data: RevenuePoint[]; loading: boolean }) {
  if (loading) return <ChartSkeleton h={220} />
  if (data.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-12">Sin datos en este período</p>
  }
  const W = 800
  const H = 220
  const PAD = { l: 50, r: 16, t: 12, b: 30 }
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b
  const max = Math.max(1, ...data.map((d) => Number(d.amount)))
  const barW = Math.max(2, innerW / data.length - 2)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="none">
      {/* grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((p) => {
        const y = PAD.t + innerH * (1 - p)
        return (
          <g key={p}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y} y2={y} stroke="#e5e7eb" strokeDasharray="2 2" />
            <text x={PAD.l - 6} y={y + 3} fontSize="10" textAnchor="end" fill="#9ca3af">
              {(((max * p) / 100) || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}
            </text>
          </g>
        )
      })}
      {/* bars */}
      {data.map((d, i) => {
        const v = Number(d.amount)
        const h = (v / max) * innerH
        const x = PAD.l + (innerW / data.length) * i + 1
        const y = PAD.t + innerH - h
        return (
          <g key={d.date}>
            <rect x={x} y={y} width={barW} height={Math.max(1, h)} rx={2} fill="#0891b2" />
            <title>{`${d.date}: ${mxn(v)}`}</title>
          </g>
        )
      })}
      {/* x axis labels — first / mid / last */}
      {[0, Math.floor(data.length / 2), data.length - 1].filter((i, a, arr) => arr.indexOf(i) === a).map((i) => (
        <text
          key={`x-${i}`}
          x={PAD.l + (innerW / data.length) * i + barW / 2}
          y={H - 8}
          fontSize="10"
          textAnchor="middle"
          fill="#9ca3af"
        >
          {data[i]?.date.slice(5)}
        </text>
      ))}
    </svg>
  )
}

function StatusBars({ rows, loading }: { rows: StatusRow[]; loading: boolean }) {
  if (loading) return <ChartSkeleton h={180} />
  if (rows.length === 0) return <p className="text-sm text-gray-400 text-center py-8">Sin datos</p>
  const max = Math.max(1, ...rows.map((r) => Number(r.count)))
  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const meta = STATUS_LABELS[r.status] ?? { label: r.status, color: '#94a3b8' }
        const pct = (Number(r.count) / max) * 100
        return (
          <div key={r.status} className="flex items-center gap-3">
            <div className="w-24 text-xs text-gray-700">{meta.label}</div>
            <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden relative">
              <div
                className="h-full rounded"
                style={{ width: `${pct}%`, background: meta.color }}
              />
            </div>
            <div className="w-10 text-right text-xs font-medium text-gray-900">{r.count}</div>
          </div>
        )
      })}
    </div>
  )
}

function WeekdayBars({ rows, loading }: { rows: WeekdayRow[]; loading: boolean }) {
  if (loading) return <ChartSkeleton h={180} />
  // Fill missing weekdays with 0
  const byDay = new Map<number, number>()
  for (const r of rows) byDay.set(Number(r.weekday), Number(r.count))
  const data = Array.from({ length: 7 }, (_, i) => ({ weekday: i, count: byDay.get(i) ?? 0 }))
  if (data.every((d) => d.count === 0)) {
    return <p className="text-sm text-gray-400 text-center py-8">Sin datos</p>
  }
  const max = Math.max(1, ...data.map((d) => d.count))
  return (
    <div className="grid grid-cols-7 gap-2 items-end h-40">
      {data.map((d) => {
        const pct = (d.count / max) * 100
        return (
          <div key={d.weekday} className="flex flex-col items-center justify-end h-full">
            <div className="text-xs text-gray-500 mb-1">{d.count || ''}</div>
            <div
              className="w-full rounded-t bg-indigo-500 transition-all"
              style={{ height: `${pct}%`, minHeight: d.count ? 4 : 0 }}
            />
            <div className="text-xs text-gray-500 mt-1">{WEEKDAY_LABELS[d.weekday]}</div>
          </div>
        )
      })}
    </div>
  )
}

function ChartSkeleton({ h }: { h: number }) {
  return (
    <div
      className="animate-pulse rounded bg-gray-100"
      style={{ height: `${h}px` }}
    />
  )
}
