"use client"

import { useState, useEffect } from "react"
import { TrendingUp, Loader2 } from "lucide-react"

export default function ApiUsagePage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/api-usage")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh]"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
  }

  if (!data) return <p className="text-red-500 text-sm">Error cargando datos</p>

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-2">
        <TrendingUp className="w-6 h-6" /> Consumo API
      </h1>
      <p className="text-sm text-slate-500 mb-6">Periodo: {data.month}</p>

      {/* Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Mensajes Totales</p>
          <p className="text-2xl font-bold text-slate-900">{data.totals?.messages?.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Mensajes Bot</p>
          <p className="text-2xl font-bold text-slate-900">{data.totals?.botMessages?.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Costo Estimado (USD)</p>
          <p className="text-2xl font-bold text-slate-900">${data.totals?.estimatedCostUSD?.toLocaleString()}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Tenant</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Total Msgs</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Inbound</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Outbound</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Bot Msgs</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Tokens (est.)</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Costo (USD)</th>
              </tr>
            </thead>
            <tbody>
              {(data.usage || []).map((u: any) => (
                <tr key={u.tenantId} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{u.tenantName}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{u.tenantSlug}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700">{u.totalMessages.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-slate-500">{u.inboundMessages.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-slate-500">{u.outboundMessages.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-700">{u.botMessages.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-slate-500 font-mono text-xs">{u.estimatedTokens.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">${u.estimatedCostUSD}</td>
                </tr>
              ))}
              {(!data.usage || data.usage.length === 0) && (
                <tr><td colSpan={7} className="text-center py-8 text-slate-400">Sin consumo este mes</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
