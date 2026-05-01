"use client"

import { useState, useEffect } from "react"
import { Users, Loader2 } from "lucide-react"

export default function UsersPage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/users")
      .then(r => r.json())
      .then(d => { setData(d.users || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh]"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
        <Users className="w-6 h-6" /> Usuarios ({data.length})
      </h1>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Nombre</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Tenant</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Role</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Último Login</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Creado</th>
              </tr>
            </thead>
            <tbody>
              {data.map(u => (
                <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{u.name || "—"}</td>
                  <td className="px-4 py-2.5 text-slate-600">{u.email}</td>
                  <td className="px-4 py-2.5">
                    <a href={`/admin/tenants/${u.tenantId}`} className="text-teal-600 hover:underline text-xs">
                      {u.tenantName || u.tenantSlug || "—"}
                    </a>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                      u.role === "super_admin"
                        ? "bg-violet-50 text-violet-700 border border-violet-200"
                        : u.role === "admin"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-slate-50 text-slate-600 border border-slate-200"
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${u.isActive !== false ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                      {u.isActive !== false ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }) : "Nunca"}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-400">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString("es-MX") : "—"}
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-slate-400">Sin usuarios</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
