'use client'

import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, AlertTriangle, ExternalLink, Loader2, CreditCard } from 'lucide-react'

type ConnectStatus = 'none' | 'pending' | 'active' | 'restricted'

interface StatusResponse {
  connected: boolean
  status: ConnectStatus
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
  requirementsCurrentlyDue?: string[]
  error?: string
}

export default function StripeConnectCard() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<StatusResponse | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const r = await fetch('/api/dashboard/billing/connect/status')
      const j = await r.json()
      setData(j)
    } catch {
      setErr('No se pudo consultar el estado de Stripe.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function startOnboarding() {
    setBusy(true)
    setErr(null)
    try {
      const r = await fetch('/api/dashboard/billing/connect/start', { method: 'POST' })
      const j = await r.json()
      if (j.url) {
        window.location.href = j.url
        return
      }
      setErr(j.error || 'No se pudo iniciar el onboarding')
    } catch {
      setErr('No se pudo conectar con Stripe.')
    } finally {
      setBusy(false)
    }
  }

  async function openExpressDashboard() {
    setBusy(true)
    setErr(null)
    try {
      const r = await fetch('/api/dashboard/billing/connect/dashboard', { method: 'POST' })
      const j = await r.json()
      if (j.url) {
        window.open(j.url, '_blank', 'noopener,noreferrer')
      } else {
        setErr(j.error || 'No se pudo abrir el dashboard')
      }
    } catch {
      setErr('No se pudo abrir el dashboard de Stripe.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando estado de Stripe…
        </div>
      </div>
    )
  }

  const status = data?.status ?? 'none'

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
          <CreditCard className="h-5 w-5 text-indigo-600" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-semibold text-gray-900">Recibir pagos de pacientes</h2>
          <p className="mt-1 text-sm text-gray-500">
            Conecta tu cuenta Stripe para que tus pacientes paguen consultas en línea
            con tarjeta u OXXO. El dinero llega a tu banco cada 1-2 días.
            Auctorum cobra una comisión del 5% por transacción.
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      {err && (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {err}
        </div>
      )}

      {/* Action buttons by status */}
      <div className="mt-5 flex flex-wrap gap-2">
        {status === 'none' && (
          <button
            onClick={startOnboarding}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
            Conectar con Stripe
          </button>
        )}

        {status === 'pending' && (
          <>
            <button
              onClick={startOnboarding}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              Continuar onboarding
            </button>
            <button
              onClick={refresh}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Actualizar estado
            </button>
          </>
        )}

        {status === 'restricted' && (
          <>
            <button
              onClick={startOnboarding}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
              Completar requisitos
            </button>
            <button
              onClick={openExpressDashboard}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <ExternalLink className="h-4 w-4" /> Dashboard de Stripe
            </button>
          </>
        )}

        {status === 'active' && (
          <>
            <button
              onClick={openExpressDashboard}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              Ir a mi dashboard de Stripe
            </button>
            <button
              onClick={refresh}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Actualizar estado
            </button>
          </>
        )}
      </div>

      {/* Restricted warnings */}
      {status === 'restricted' && data?.requirementsCurrentlyDue && data.requirementsCurrentlyDue.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <p className="font-medium mb-1">Stripe requiere información adicional:</p>
          <ul className="list-disc pl-4 space-y-0.5">
            {data.requirementsCurrentlyDue.slice(0, 5).map((r) => (
              <li key={r}>{r.replace(/[._]/g, ' ')}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Capability footer */}
      {status !== 'none' && (
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <Capability label="Pagos con tarjeta" enabled={data?.chargesEnabled} />
          <Capability label="Transferencias" enabled={data?.payoutsEnabled} />
          <Capability label="Datos completos" enabled={data?.detailsSubmitted} />
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: ConnectStatus }) {
  const cfg = {
    none: { label: 'No conectado', cls: 'bg-gray-100 text-gray-600' },
    pending: { label: 'Pendiente', cls: 'bg-amber-50 text-amber-700' },
    restricted: { label: 'Requisitos pendientes', cls: 'bg-amber-100 text-amber-800' },
    active: { label: 'Conectado', cls: 'bg-emerald-50 text-emerald-700' },
  }[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.cls}`}>
      {status === 'active' && <CheckCircle2 className="h-3 w-3" />}
      {status === 'restricted' && <AlertTriangle className="h-3 w-3" />}
      {cfg.label}
    </span>
  )
}

function Capability({ label, enabled }: { label: string; enabled: boolean | undefined }) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 ${
        enabled
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-gray-200 bg-gray-50 text-gray-500'
      }`}
    >
      {enabled ? <CheckCircle2 className="h-3 w-3" /> : <span className="h-2 w-2 rounded-full bg-gray-300" />}
      <span className="text-[11px]">{label}</span>
    </div>
  )
}
