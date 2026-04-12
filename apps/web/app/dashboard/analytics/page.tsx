'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2 } from 'lucide-react'

function formatMXN(amount: number | string) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num)
}

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/analytics', { credentials: 'include' })
      if (!res.ok) throw new Error('Error al cargar analytics')
      const json = await res.json()
      setData(json)
    } catch (err: any) {
      setError(err?.message || 'Error al cargar analytics')
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchAnalytics() }, [fetchAnalytics])

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
        <p className="text-sm text-red-600">{error || 'Error al cargar analytics'}</p>
      </div>
    )
  }

  const f = data.funnel ?? { sent: 0, opened: 0, accepted: 0 }
  const sent = f.sent
  const hasData = sent > 0 || f.opened > 0 || f.accepted > 0
  const pct = (n: number) => sent > 0 ? Math.round((n / sent) * 100) : 0
  const openedRate = sent > 0 ? Math.round((f.opened / sent) * 100) : 0
  const acceptedRate = f.opened > 0 ? Math.round((f.accepted / f.opened) * 100) : 0

  const stages = [
    { key: 'sent', label: 'Enviadas', rawCount: sent, width: 100, color: 'var(--accent)' },
    { key: 'opened', label: 'Abiertas', rawCount: f.opened, width: pct(Math.min(f.opened, sent)), color: 'var(--warning)' },
    { key: 'accepted', label: 'Aceptadas', rawCount: f.accepted, width: pct(Math.min(f.accepted, sent)), color: 'var(--success)' },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Analytics</h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-0.5">Métricas de conversión, productos y clientes (30 días)</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--border-hover)] transition-colors">
          <p className="text-[11px] font-mono text-[var(--text-tertiary)] uppercase tracking-wide">Tasa de conversion</p>
          <p className="text-4xl font-bold mt-2" style={{ color: data.conversionRate >= 50 ? 'var(--success)' : data.conversionRate >= 25 ? 'var(--warning)' : 'var(--error)' }}>
            {data.conversionRate}%
          </p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">{data.acceptedCount} de {data.totalQuotes} aceptadas</p>
        </div>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--border-hover)] transition-colors">
          <p className="text-[11px] font-mono text-[var(--text-tertiary)] uppercase tracking-wide">Revenue (aceptadas)</p>
          <p className="text-3xl font-bold text-[var(--text-primary)] mt-2">{formatMXN(data.totalRevenue)}</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">ultimos 30 dias</p>
        </div>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--border-hover)] transition-colors">
          <p className="text-[11px] font-mono text-[var(--text-tertiary)] uppercase tracking-wide">Ticket promedio</p>
          <p className="text-3xl font-bold text-[var(--text-primary)] mt-2">{formatMXN(data.avgQuoteValue)}</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">por cotizacion</p>
        </div>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--border-hover)] transition-colors">
          <p className="text-[11px] font-mono text-[var(--text-tertiary)] uppercase tracking-wide">Total cotizaciones</p>
          <p className="text-3xl font-bold text-[var(--text-primary)] mt-2">{data.totalQuotes}</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">generadas en 30 dias</p>
        </div>
      </div>

      {/* Funnel section */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6 mb-6">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Funnel de conversion</h2>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Enviadas - Abiertas - Aceptadas - ultimos 30 dias</p>
        </div>
        {!hasData ? (
          <p className="text-center text-[var(--text-tertiary)] py-6 text-sm">Sin datos suficientes todavía</p>
        ) : (
          <div className="space-y-4">
            {stages.map((s, idx) => (
              <div key={s.key}>
                <div className="flex justify-between items-baseline mb-1.5">
                  <span className="text-sm font-medium text-[var(--text-secondary)]">{s.label}</span>
                  <span className="text-sm text-[var(--text-tertiary)]">
                    <span className="font-mono font-semibold text-[var(--text-primary)]">{s.rawCount}</span>
                    {' - '}{s.width}% del total
                  </span>
                </div>
                <div className="w-full bg-[var(--bg-tertiary)] rounded-full h-3 overflow-hidden">
                  <div className="h-3 rounded-full transition-all" style={{ width: `${Math.max(s.width, 2)}%`, backgroundColor: s.color }} />
                </div>
                {idx < stages.length - 1 && (
                  <p className="text-[11px] text-[var(--text-tertiary)] mt-1.5 font-mono">
                    {idx === 0 ? `${openedRate}% apertura` : `${acceptedRate}% aceptacion`}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border)]">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Top productos cotizados</h2>
          </div>
          <div className="p-6 space-y-4">
            {data.topProducts && data.topProducts.length > 0 ? (
              data.topProducts.map((p: any, i: number) => {
                const maxRevenue = data.topProducts[0]?.revenue || 1
                const width = Math.max(10, Math.round((p.revenue / maxRevenue) * 100))
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-[var(--text-secondary)] truncate mr-4">{p.name}</span>
                      <span className="text-[var(--text-tertiary)] whitespace-nowrap">{p.count} uds · {formatMXN(p.revenue)}</span>
                    </div>
                    <div className="w-full bg-[var(--bg-tertiary)] rounded-full h-2">
                      <div className="bg-[var(--accent)] h-2 rounded-full transition-all" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-center text-[var(--text-tertiary)] py-8 text-sm">Sin datos de productos todavía</p>
            )}
          </div>
        </div>

        {/* Top Clients */}
        <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border)]">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Top clientes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--border)]">
                <tr className="text-[var(--text-tertiary)]">
                  <th className="text-left px-6 py-2.5 text-[11px] font-mono uppercase tracking-wide">Empresa</th>
                  <th className="text-right px-6 py-2.5 text-[11px] font-mono uppercase tracking-wide">Cotiz.</th>
                  <th className="text-right px-6 py-2.5 text-[11px] font-mono uppercase tracking-wide">Revenue</th>
                  <th className="text-right px-6 py-2.5 text-[11px] font-mono uppercase tracking-wide">Tasa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {data.topClients && data.topClients.length > 0 ? (
                  data.topClients.map((c: any, i: number) => (
                    <tr key={i} className="hover:bg-[var(--bg-elevated)] transition-colors">
                      <td className="px-6 py-3 font-medium text-[var(--text-primary)]">{c.company || 'Sin empresa'}</td>
                      <td className="px-6 py-3 text-right text-[var(--text-secondary)]">{c.quotes}</td>
                      <td className="px-6 py-3 text-right font-mono font-medium text-[var(--text-primary)]">{formatMXN(c.revenue || 0)}</td>
                      <td className="px-6 py-3 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${
                          (c.rate || 0) >= 50 ? 'text-[var(--success)] bg-[var(--success)]/10' :
                          (c.rate || 0) >= 25 ? 'text-[var(--warning)] bg-[var(--warning)]/10' :
                          'text-[var(--error)] bg-[var(--error)]/10'
                        }`}>
                          {c.rate || 0}%
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-[var(--text-tertiary)] text-sm">Sin datos de clientes todavía</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
