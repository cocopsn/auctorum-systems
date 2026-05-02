'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { Loader2, CreditCard, ExternalLink, RefreshCw } from 'lucide-react'

interface Kpis {
  grossCentavos: number
  feesCentavos: number
  netCentavos: number
  countSucceeded: number
  countPending: number
}
interface PaymentRow {
  id: string
  amount: number
  applicationFee: number
  status: string
  description: string | null
  patientName: string | null
  patientEmail: string | null
  paymentMethod: string | null
  receiptUrl: string | null
  failureReason: string | null
  createdAt: string
  stripeCheckoutSessionId: string | null
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending:    { label: 'Pendiente',  cls: 'bg-amber-50 text-amber-700' },
  processing: { label: 'Procesando', cls: 'bg-blue-50 text-blue-700' },
  succeeded:  { label: 'Pagado',     cls: 'bg-emerald-50 text-emerald-700' },
  failed:     { label: 'Fallido',    cls: 'bg-rose-50 text-rose-700' },
  refunded:   { label: 'Reembolsado', cls: 'bg-gray-100 text-gray-600' },
  cancelled:  { label: 'Cancelado',  cls: 'bg-gray-100 text-gray-500' },
}

function fmtMxn(centavos: number): string {
  return (centavos / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}
function fmtDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) +
         ' ' + d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

export default function PagosPage() {
  const [kpis, setKpis] = useState<Kpis | null>(null)
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const r = await fetch('/api/dashboard/patient-payments')
      if (!r.ok) {
        setErr('No se pudieron cargar los pagos.')
        return
      }
      const j = await r.json()
      setKpis(j.kpis)
      setPayments(j.payments ?? [])
    } catch {
      setErr('Error de red.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  async function handleRefund(p: PaymentRow) {
    if (!confirm(
      `¿Reembolsar ${fmtMxn(p.amount)} a ${p.patientName ?? 'el paciente'}?\n\n` +
      `Se revertirá el dinero al método de pago original. Esta acción no se puede deshacer.`,
    )) return
    const r = await fetch(`/api/dashboard/patient-payments/${p.id}/refund`, { method: 'POST' })
    if (r.ok) {
      alert('Reembolso procesado.')
      refresh()
    } else {
      const j = await r.json().catch(() => ({}))
      alert(j.error || 'No se pudo procesar el reembolso.')
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
            <CreditCard className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Pagos recibidos</h1>
            <p className="text-sm text-gray-500">Pagos en línea de tus pacientes vía Stripe.</p>
          </div>
        </div>
        <button
          onClick={refresh}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Actualizar
        </button>
      </div>

      {err && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Cobrado este mes" value={fmtMxn(kpis?.grossCentavos ?? 0)} hue="emerald" />
        <Kpi label="Comisión Auctorum" value={fmtMxn(kpis?.feesCentavos ?? 0)} hue="gray" />
        <Kpi label="Neto del mes" value={fmtMxn(kpis?.netCentavos ?? 0)} hue="blue" />
        <Kpi label="Pendientes" value={String(kpis?.countPending ?? 0)} hue="amber" />
      </div>

      {/* Table */}
      <div className="card-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-tertiary)]/40">
                <Th>Fecha</Th>
                <Th>Paciente</Th>
                <Th>Concepto</Th>
                <Th className="text-right">Monto</Th>
                <Th className="text-right">Comisión</Th>
                <Th>Método</Th>
                <Th>Status</Th>
                <Th>Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400"><Loader2 className="inline h-4 w-4 animate-spin" /></td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  Aún no tienes pagos. Conecta Stripe en Configuración → Suscripción para empezar.
                </td></tr>
              ) : payments.map((p) => {
                const sl = STATUS_LABEL[p.status] ?? { label: p.status, cls: 'bg-gray-100 text-gray-600' }
                return (
                  <tr key={p.id} className="row-alt border-b border-[var(--border)] transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(p.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{p.patientName || '—'}</div>
                      {p.patientEmail && <div className="text-[11px] text-gray-400">{p.patientEmail}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{p.description || '—'}</td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-gray-900">{fmtMxn(p.amount)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-gray-500">{fmtMxn(p.applicationFee)}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {p.paymentMethod === 'card' ? '💳 Tarjeta' : p.paymentMethod === 'oxxo' ? '🏪 OXXO' : (p.paymentMethod ?? '—')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${sl.cls}`}>{sl.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {p.receiptUrl && (
                          <a
                            href={p.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                            title="Ver recibo de Stripe"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {p.status === 'succeeded' && (
                          <button
                            onClick={() => handleRefund(p)}
                            className="px-2 py-1 text-[11px] rounded text-rose-600 hover:bg-rose-50"
                            title="Reembolsar"
                          >
                            Reembolsar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Kpi({ label, value, hue }: { label: string; value: string; hue: 'emerald' | 'blue' | 'amber' | 'gray' }) {
  const cls = {
    emerald: 'border-l-emerald-300',
    blue: 'border-l-blue-300',
    amber: 'border-l-amber-300',
    gray: 'border-l-gray-300',
  }[hue]
  return (
    <div className={`card-soft p-4 border-l-4 ${cls}`}>
      <div className="text-[11px] font-mono uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
    </div>
  )
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`text-left px-4 py-3 text-[11px] font-mono uppercase tracking-wide text-gray-500 ${className ?? ''}`}>
      {children}
    </th>
  )
}
