"use client"

import { useState, useEffect } from "react"
import { ClipboardList, Loader2, ChevronLeft, ChevronRight } from "lucide-react"

export default function AuditPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ action: "", tenantId: "", from: "", to: "" })
  const [offset, setOffset] = useState(0)
  const limit = 50

  function fetchLogs() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.action) params.set("action", filters.action)
    if (filters.tenantId) params.set("tenantId", filters.tenantId)
    if (filters.from) params.set("from", filters.from)
    if (filters.to) params.set("to", filters.to)
    params.set("limit", String(limit))
    params.set("offset", String(offset))

    fetch(`/api/admin/audit?${params}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchLogs() }, [offset])

  function handleSearch() { setOffset(0); fetchLogs() }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
        <ClipboardList className="w-6 h-6" /> Audit Log
      </h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Acción..."
          value={filters.action}
          onChange={e => setFilters(f => ({ ...f, action: e.target.value }))}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 w-40"
        />
        <input
          type="date"
          value={filters.from}
          onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5"
        />
        <input
          type="date"
          value={filters.to}
          onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5"
        />
        <button onClick={handleSearch} className="px-4 py-1.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700">
          Buscar
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[30vh]"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Fecha</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Tenant</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Usuario</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Acción</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Entidad</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.logs || []).map((l: any) => (
                    <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                        {l.createdAt ? new Date(l.createdAt).toLocaleString("es-MX", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-700">{l.tenantName}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-700">{l.userName}</td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs font-medium text-slate-800 bg-slate-100 px-2 py-0.5 rounded">{l.action}</span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{l.entity}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-400 font-mono">{l.ipAddress || "—"}</td>
                    </tr>
                  ))}
                  {(!data?.logs || data.logs.length === 0) && (
                    <tr><td colSpan={6} className="text-center py-8 text-slate-400">Sin registros de auditoría</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
            <span>Mostrando {offset + 1}–{Math.min(offset + limit, data?.total || 0)} de {data?.total || 0}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= (data?.total || 0)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                Siguiente <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
