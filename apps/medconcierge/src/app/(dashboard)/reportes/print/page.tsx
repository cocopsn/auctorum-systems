'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type Summary = {
  period: { from: string; to: string; days: number }
  appointments: { total: number; completed: number; cancelled: number; noShow: number; completionRate: number }
  patients: { new: number }
  revenue: { total: number; net: number; payments: number; avgPerDay: number }
}
type RevenuePoint = { date: string; amount: number; count: number }
type StatusRow = { status: string; count: number }

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Agendadas',
  confirmed: 'Confirmadas',
  completed: 'Completadas',
  cancelled: 'Canceladas',
  no_show: 'No-show',
}

/**
 * Print-friendly version of /reportes. Layout is intentionally
 * monochrome and centered for clean Ctrl+P → "Save as PDF" output.
 * Triggered by the Descargar PDF button on /reportes which opens this
 * URL in a new tab; useEffect calls window.print() once data is loaded.
 */
export default function ReportesPrintPage() {
  const sp = useSearchParams()
  const today = new Date().toISOString().split('T')[0]
  const monthStart = today.substring(0, 7) + '-01'
  const from = sp.get('from') ?? monthStart
  const to = sp.get('to') ?? today
  const auto = sp.get('auto') !== '0'

  const [summary, setSummary] = useState<Summary | null>(null)
  const [revenue, setRevenue] = useState<RevenuePoint[]>([])
  const [statusRows, setStatusRows] = useState<StatusRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
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
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [from, to])

  useEffect(() => {
    if (!loading && !error && summary && auto) {
      // Give the browser a tick to render before triggering the print dialog
      const t = setTimeout(() => window.print(), 400)
      return () => clearTimeout(t)
    }
  }, [loading, error, summary, auto])

  if (loading) return <div className="p-12 text-center text-stone-500">Cargando reporte…</div>
  if (error) return <div className="p-12 text-center text-rose-700">No pudimos cargar: {error}</div>
  if (!summary) return null

  const totalRevenue = (summary.revenue.total ?? 0) / 100

  return (
    <div className="report-print">
      <header className="report-print__header">
        <div>
          <p className="report-print__eyebrow">REPORTE FINANCIERO</p>
          <h1>Auctorum Med</h1>
        </div>
        <div className="report-print__period">
          <p className="report-print__period-label">PERÍODO</p>
          <p className="report-print__period-value">{from} → {to}</p>
          <p className="report-print__period-days">{summary.period.days} días</p>
        </div>
      </header>

      <section className="report-print__kpis">
        <Kpi label="Citas total" value={summary.appointments.total} />
        <Kpi label="Completadas" value={summary.appointments.completed} sub={`${summary.appointments.completionRate}% completion`} />
        <Kpi label="Canceladas" value={summary.appointments.cancelled} />
        <Kpi label="No-show" value={summary.appointments.noShow} />
        <Kpi label="Pacientes nuevos" value={summary.patients.new} />
        <Kpi
          label="Revenue"
          value={`$${totalRevenue.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`}
          sub={`${summary.revenue.payments} pagos · prom. $${(summary.revenue.avgPerDay / 100).toLocaleString('es-MX', { maximumFractionDigits: 0 })}/día`}
        />
      </section>

      <section className="report-print__section">
        <h2>Citas por status</h2>
        <table>
          <thead><tr><th align="left">Status</th><th align="right">Cantidad</th></tr></thead>
          <tbody>
            {statusRows.length === 0 ? (
              <tr><td colSpan={2} className="muted">Sin datos.</td></tr>
            ) : (
              statusRows.map((r) => (
                <tr key={r.status}>
                  <td>{STATUS_LABELS[r.status] ?? r.status}</td>
                  <td align="right">{Number(r.count).toLocaleString('es-MX')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="report-print__section">
        <h2>Ingresos por día</h2>
        <table>
          <thead><tr><th align="left">Fecha</th><th align="right">Pagos</th><th align="right">Monto</th></tr></thead>
          <tbody>
            {revenue.length === 0 ? (
              <tr><td colSpan={3} className="muted">Sin pagos en el período.</td></tr>
            ) : (
              revenue.map((r) => (
                <tr key={r.date}>
                  <td>{r.date}</td>
                  <td align="right">{r.count}</td>
                  <td align="right">${(Number(r.amount) / 100).toLocaleString('es-MX', { maximumFractionDigits: 0 })}</td>
                </tr>
              ))
            )}
            <tr className="total">
              <td><strong>Total</strong></td>
              <td align="right"><strong>{summary.revenue.payments}</strong></td>
              <td align="right"><strong>${totalRevenue.toLocaleString('es-MX', { maximumFractionDigits: 0 })}</strong></td>
            </tr>
          </tbody>
        </table>
      </section>

      <footer className="report-print__footer">
        Generado el {new Date().toLocaleString('es-MX')} · auctorum.com.mx
      </footer>

      <button type="button" onClick={() => window.print()} className="report-print__btn no-print">
        Imprimir / Guardar como PDF
      </button>

      <style>{`
        body { background: white; }
        .report-print {
          max-width: 760px;
          margin: 0 auto;
          padding: 36px 32px;
          font-family: 'IBM Plex Sans', system-ui, sans-serif;
          color: #111827;
        }
        .report-print__header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 18px;
          border-bottom: 2px solid #111827;
          margin-bottom: 24px;
        }
        .report-print__eyebrow {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.2em;
          margin: 0 0 6px;
          color: #4b5563;
        }
        .report-print__header h1 {
          font-size: 28px;
          font-weight: 700;
          margin: 0;
          letter-spacing: -0.01em;
        }
        .report-print__period { text-align: right; font-size: 12px; }
        .report-print__period-label { font-weight: 700; letter-spacing: 0.18em; margin: 0 0 4px; color: #4b5563; font-size: 9px; }
        .report-print__period-value { font-size: 14px; margin: 0; font-weight: 600; }
        .report-print__period-days { color: #6b7280; margin: 2px 0 0; }
        .report-print__kpis {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px 18px;
          margin-bottom: 26px;
        }
        .kpi-print {
          padding: 12px 0;
          border-top: 1px solid #e5e7eb;
        }
        .kpi-print__label { font-size: 9px; font-weight: 700; letter-spacing: 0.18em; color: #4b5563; margin: 0 0 4px; }
        .kpi-print__value { font-size: 22px; font-weight: 700; margin: 0; letter-spacing: -0.01em; }
        .kpi-print__sub { font-size: 11px; color: #6b7280; margin: 2px 0 0; }
        .report-print__section { margin-bottom: 28px; page-break-inside: avoid; }
        .report-print__section h2 {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin: 0 0 12px;
          color: #111827;
        }
        .report-print table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .report-print th { padding: 8px 0; border-bottom: 1.5px solid #111827; font-weight: 700; font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; }
        .report-print td { padding: 6px 0; border-bottom: 1px solid #e5e7eb; }
        .report-print td.muted { color: #6b7280; padding: 14px 0; text-align: center; }
        .report-print tr.total td { border-bottom: 2px solid #111827; padding-top: 10px; }
        .report-print__footer { margin-top: 32px; padding-top: 14px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #6b7280; text-align: center; }
        .report-print__btn {
          position: fixed;
          right: 20px;
          bottom: 20px;
          padding: 10px 16px;
          background: #0E7490;
          color: white;
          border: none;
          border-radius: 8px;
          font-family: inherit;
          font-size: 13px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        @media print {
          .no-print { display: none !important; }
          .report-print { padding: 0; }
          @page { margin: 18mm 14mm; }
        }
      `}</style>
    </div>
  )
}

function Kpi({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="kpi-print">
      <p className="kpi-print__label">{label.toUpperCase()}</p>
      <p className="kpi-print__value">{value}</p>
      {sub ? <p className="kpi-print__sub">{sub}</p> : null}
    </div>
  )
}
