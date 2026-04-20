"use client"

import { useState, useEffect } from "react"
import { Building2, Loader2, ExternalLink } from "lucide-react"

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  suspended: "bg-red-50 text-red-700 border-red-200",
  draft: "bg-slate-50 text-slate-600 border-slate-200",
  pending_plan: "bg-amber-50 text-amber-700 border-amber-200",
}

export default function TenantsPage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/tenants")
      .then(r => r.json())
      .then(d => { setData(d.tenants || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function toggleStatus(id: string, current: string) {
    const next = current === "active" ? "suspended" : "active"
    await fetch(`/api/admin/tenants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provisioningStatus: next, isActive: next === "active" }),
    })
    setData(prev => prev.map(t => t.id === id ? { ...t, provisioningStatus: next, isActive: next === "active" } : t))
  }

  async function changePlan(id: string, plan: string) {
    await fetch(`/api/admin/tenants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    })
    setData(prev => prev.map(t => t.id === id ? { ...t, plan } : t))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Building2 className="w-6 h-6" />
          Tenants ({data.length})
        </h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Nombre</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Slug</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Plan</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Usuarios</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Msgs/mes</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Revenue</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data.map(t => (
                <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <a href={`/admin/tenants/${t.id}`} className="font-medium text-slate-900 hover:text-teal-600 transition-colors">
                      {t.name}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{t.slug}</td>
                  <td className="px-4 py-3">
                    <select
                      value={t.plan || "basico"}
                      onChange={e => changePlan(t.id, e.target.value)}
                      className="text-xs border border-slate-200 rounded px-2 py-1 bg-white"
                    >
                      <option value="basico">Basico</option>
                      <option value="profesional">Profesional</option>
                      <option value="premium">Premium</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium border ${STATUS_COLORS[t.provisioningStatus] || STATUS_COLORS.draft}`}>
                      {t.provisioningStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">{t.userCount}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{t.messagesThisMonth}</td>
                  <td className="px-4 py-3 text-right text-slate-600 font-mono text-xs">
                    ${Number(t.subscription?.amount || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <a
                        href={`/admin/tenants/${t.id}`}
                        className="p-1.5 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                        title="Ver detalle"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => toggleStatus(t.id, t.provisioningStatus)}
                        className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                          t.provisioningStatus === "active"
                            ? "bg-red-50 text-red-600 hover:bg-red-100"
                            : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                        }`}
                      >
                        {t.provisioningStatus === "active" ? "Suspender" : "Activar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={8} className="text-center py-8 text-slate-400">Sin tenants</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
