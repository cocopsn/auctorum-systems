"use client"

import { useState, useEffect } from "react"
import { Server, Loader2, CheckCircle2, XCircle, RefreshCw, Database, HardDrive } from "lucide-react"

function StatusCard({ label, status, children }: { label: string; status: "ok" | "error" | "unknown"; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700">{label}</h3>
        {status === "ok" && <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />}
        {status === "error" && <XCircle className="w-4.5 h-4.5 text-red-500" />}
        {status === "unknown" && <div className="w-3 h-3 rounded-full bg-slate-300" />}
      </div>
      {children}
    </div>
  )
}

export default function SystemPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  function refresh() {
    setLoading(true)
    fetch("/api/admin/health")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [])

  if (loading && !data) {
    return <div className="flex items-center justify-center min-h-[40vh]"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
  }

  const checks = data?.checks || {}

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Server className="w-6 h-6" /> Sistema
        </h1>
        <button onClick={refresh} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg text-sm text-slate-700 hover:bg-slate-200 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Database */}
        <StatusCard label="Database" status={checks.database?.status === "ok" ? "ok" : "error"}>
          <dl className="text-xs space-y-1">
            <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd className="font-medium text-slate-800">{checks.database?.status}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Size</dt><dd className="font-mono">{checks.database?.dbSizeMB} MB</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Server Time</dt><dd className="text-slate-600">{checks.database?.serverTime ? new Date(checks.database.serverTime).toLocaleString("es-MX") : "—"}</dd></div>
          </dl>
        </StatusCard>

        {/* Redis */}
        <StatusCard label="Redis" status={checks.redis?.status === "configured" ? "ok" : "unknown"}>
          <dl className="text-xs space-y-1">
            <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd className="font-medium text-slate-800">{checks.redis?.status}</dd></div>
            {checks.redis?.url && <div className="flex justify-between"><dt className="text-slate-500">URL</dt><dd className="font-mono text-[10px] truncate max-w-[150px]">{checks.redis.url}</dd></div>}
          </dl>
        </StatusCard>

        {/* Memory */}
        <StatusCard label="Node.js Memory" status="ok">
          <dl className="text-xs space-y-1">
            <div className="flex justify-between"><dt className="text-slate-500">RSS</dt><dd className="font-mono">{checks.memory?.rss}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Heap Used</dt><dd className="font-mono">{checks.memory?.heapUsed}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Heap Total</dt><dd className="font-mono">{checks.memory?.heapTotal}</dd></div>
          </dl>
        </StatusCard>
      </div>

      {/* Table Counts */}
      {checks.tableCounts && !checks.tableCounts.error && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><Database className="w-4 h-4" /> Registros en Base de Datos</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(checks.tableCounts).map(([table, count]) => (
              <div key={table} className="bg-slate-50 rounded-lg p-3">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">{table}</p>
                <p className="text-lg font-bold text-slate-900">{Number(count).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Environment */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><HardDrive className="w-4 h-4" /> Entorno</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-xs">
          {checks.environment && Object.entries(checks.environment).map(([key, val]) => (
            <div key={key} className="flex justify-between py-1 border-b border-slate-50">
              <dt className="text-slate-500">{key}</dt>
              <dd className={`font-medium ${val === "configured" ? "text-emerald-600" : val === "missing" ? "text-red-500" : "text-slate-700"}`}>{String(val)}</dd>
            </div>
          ))}
        </dl>
        <p className="text-[10px] text-slate-400 mt-3">Última verificación: {data?.timestamp ? new Date(data.timestamp).toLocaleString("es-MX") : "—"}</p>
      </div>
    </div>
  )
}
