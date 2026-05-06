'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, Loader2, MessageCircle, Sparkles, HardDrive, Zap } from 'lucide-react'

type UsageRow = {
  used: number
  planLimit: number
  addonRemaining: number
  totalLimit: number
  pct: number
}

type UsageResponse = {
  period: string
  plan: string
  usage: {
    whatsapp_messages: UsageRow
    api_calls: UsageRow
    ai_tokens: UsageRow
    storage_bytes: UsageRow
  }
  counters: { patients: number; appointments: number; campaigns: number }
  addons: Array<{
    id: string
    addonType: string
    packageId: string
    quantity: number
    remaining: number
    purchasedAt: string
    expiresAt: string | null
  }>
  addonPackages: Array<{
    id: string
    name: string
    description: string
    quantity: number
    price: number
    type: string
  }>
}

const METRIC_META: Record<keyof UsageResponse['usage'], { label: string; icon: React.ReactNode; format: (n: number) => string }> = {
  whatsapp_messages: { label: 'Mensajes WhatsApp', icon: <MessageCircle className="w-4 h-4" />,  format: (n) => n.toLocaleString('es-MX') },
  api_calls:         { label: 'API calls (mes)',   icon: <Zap className="w-4 h-4" />,            format: (n) => n.toLocaleString('es-MX') },
  ai_tokens:         { label: 'Tokens AI',         icon: <Sparkles className="w-4 h-4" />,       format: (n) => n.toLocaleString('es-MX') },
  storage_bytes:     { label: 'Almacenamiento',    icon: <HardDrive className="w-4 h-4" />,      format: (n) => formatBytes(n) },
}

function formatBytes(b: number): string {
  if (b < 1_000_000) return `${(b / 1000).toFixed(0)} KB`
  if (b < 1_000_000_000) return `${(b / 1_000_000).toFixed(1)} MB`
  return `${(b / 1_000_000_000).toFixed(2)} GB`
}

export function UsageWidget() {
  const [data, setData] = useState<UsageResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [purchasing, setPurchasing] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard/usage')
      if (!res.ok) throw new Error(await res.text())
      setData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando uso')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function handlePurchase(addonId: string) {
    setError('')
    setPurchasing(addonId)
    try {
      const res = await fetch('/api/dashboard/usage/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addonId, processor: 'mercadopago' }),
      })
      const json = await res.json()
      if (!res.ok || !json.checkoutUrl) {
        throw new Error(json.error ?? 'No pudimos iniciar el pago')
      }
      window.location.href = json.checkoutUrl
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setPurchasing(null)
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    )
  }
  if (!data) return null

  const metrics = ['whatsapp_messages', 'api_calls', 'ai_tokens', 'storage_bytes'] as const

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{error}</div>
      )}

      {/* Usage bars */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Uso del mes ({data.period})</h3>
          <span className="text-xs text-gray-500">
            Plan: <strong className="text-gray-900">{data.plan}</strong>
          </span>
        </div>
        <div className="space-y-4">
          {metrics.map((m) => (
            <UsageBar key={m} metric={m} row={data.usage[m]} meta={METRIC_META[m]} />
          ))}
        </div>
      </div>

      {/* Add-on packages */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="font-semibold text-gray-900 mb-1">Paquetes adicionales</h3>
        <p className="text-xs text-gray-500 mb-4">
          Aumenta tus límites del mes. El cargo se procesa por MercadoPago y se acredita al confirmar el pago.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.addonPackages.map((pkg) => (
            <div key={pkg.id} className="border border-gray-200 rounded-lg p-3 flex flex-col">
              <div className="flex-1">
                <p className="font-medium text-gray-900">{pkg.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{pkg.description}</p>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-lg font-bold text-gray-900">
                  ${(pkg.price / 100).toLocaleString('es-MX')}
                  <span className="text-xs font-normal text-gray-400 ml-1">MXN</span>
                </span>
                <button
                  type="button"
                  onClick={() => void handlePurchase(pkg.id)}
                  disabled={!!purchasing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {purchasing === pkg.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>Comprar <ExternalLink className="w-3 h-3" /></>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active addons */}
      {data.addons.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Paquetes activos</h3>
          <ul className="space-y-2 text-sm">
            {data.addons.map((a) => (
              <li key={a.id} className="flex items-center justify-between border-b last:border-0 border-gray-100 pb-2 last:pb-0">
                <span className="text-gray-700">{a.packageId}</span>
                <span className="text-xs text-gray-500">
                  Restante: <strong>{Number(a.remaining).toLocaleString('es-MX')}</strong> / {Number(a.quantity).toLocaleString('es-MX')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function UsageBar({
  metric,
  row,
  meta,
}: {
  metric: keyof UsageResponse['usage']
  row: UsageRow
  meta: { label: string; icon: React.ReactNode; format: (n: number) => string }
}) {
  const unlimited = row.totalLimit === -1
  const pct = unlimited ? 0 : Math.min(100, row.pct)
  const color = pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : 'bg-teal-500'

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
          <span className="text-gray-400">{meta.icon}</span>
          {meta.label}
        </span>
        <span className="text-xs text-gray-600">
          {unlimited ? (
            <span className="text-emerald-600 font-medium">Ilimitado · {meta.format(row.used)} usados</span>
          ) : (
            <>
              <strong className="text-gray-900">{meta.format(row.used)}</strong>
              {' / '}
              {meta.format(row.totalLimit)}
              {row.addonRemaining > 0 && (
                <span className="text-emerald-600 ml-1">(+{meta.format(row.addonRemaining)} addon)</span>
              )}
            </>
          )}
        </span>
      </div>
      {!unlimited && (
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
        </div>
      )}
      {!unlimited && pct >= 80 && (
        <p className="text-xs text-amber-700 mt-1">
          {pct >= 100 ? '¡Límite alcanzado!' : `${100 - pct}% restante`}
          {' — '}
          <a href="#addons" className="underline">comprar más</a>
        </p>
      )}
    </div>
  )
}
