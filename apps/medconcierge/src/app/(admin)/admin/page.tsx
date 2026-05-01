"use client"

import { useState, useEffect } from "react"
import { Building2, Users, CalendarDays, MessageSquare, DollarSign, Loader2 } from "lucide-react"

function StatCard({ label, value, sub, icon: Icon, color }: { label: string; value: string | number; sub?: string; icon: any; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  )
}

export default function AdminOverview() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/stats")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!data) return <p className="text-red-500 text-sm">Error cargando datos</p>

  const { tenants: t, users: u, appointments: a, messages: m, revenue, planDistribution, recentLogs } = data

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Overview</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard label="Tenants Activos" value={t?.active ?? 0} sub={`${t?.total ?? 0} total`} icon={Building2} color="bg-teal-500" />
        <StatCard label="Usuarios" value={u?.total ?? 0} icon={Users} color="bg-blue-500" />
        <StatCard label="Citas (mes)" value={a?.thisMonth ?? 0} icon={CalendarDays} color="bg-violet-500" />
        <StatCard label="Mensajes (mes)" value={m?.thisMonth ?? 0} icon={MessageSquare} color="bg-amber-500" />
        <StatCard label="Revenue Mensual" value={`$${Number(revenue?.monthly ?? 0).toLocaleString()} MXN`} icon={DollarSign} color="bg-emerald-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Tenants por Plan</h2>
          <div className="space-y-3">
            {(planDistribution || []).map((p: any) => {
              const max = Math.max(...(planDistribution || []).map((x: any) => Number(x.count)), 1)
              const pct = (Number(p.count) / max) * 100
              return (
                <div key={p.plan || "none"}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700 capitalize">{p.plan || "Sin plan"}</span>
                    <span className="text-slate-500">{p.count}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full">
                    <div className="h-2 bg-teal-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            {(!planDistribution || planDistribution.length === 0) && (
              <p className="text-sm text-slate-400">Sin datos</p>
            )}
          </div>
        </div>

        {/* Recent Audit */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Actividad Reciente</h2>
          <div className="space-y-2">
            {(recentLogs || []).map((log: any) => (
              <div key={log.id} className="flex items-center gap-3 text-sm py-1.5 border-b border-slate-50 last:border-0">
                <div className="w-2 h-2 rounded-full bg-teal-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-slate-700">{log.action}</span>
                  <span className="text-slate-400 ml-1.5">{log.entity}</span>
                </div>
                <span className="text-[10px] text-slate-400 flex-shrink-0">
                  {log.createdAt ? new Date(log.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short" }) : ""}
                </span>
              </div>
            ))}
            {(!recentLogs || recentLogs.length === 0) && (
              <p className="text-sm text-slate-400">Sin actividad registrada</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
