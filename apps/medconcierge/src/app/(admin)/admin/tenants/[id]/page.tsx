"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { ArrowLeft, Building2, Loader2, Save, Eye, EyeOff, Users, MessageSquare, CalendarDays, CreditCard } from "lucide-react"

export default function TenantDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [configJson, setConfigJson] = useState("")
  const [configError, setConfigError] = useState("")
  const [saving, setSaving] = useState(false)
  const [showSecrets, setShowSecrets] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/tenants/${id}`)
      .then(r => r.json())
      .then(d => {
        setData(d)
        setConfigJson(JSON.stringify(d.tenant?.config || {}, null, 2))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  async function saveConfig() {
    try {
      const parsed = JSON.parse(configJson)
      setConfigError("")
      setSaving(true)
      await fetch(`/api/admin/tenants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: parsed }),
      })
      setSaving(false)
    } catch {
      setConfigError("JSON inválido")
    }
  }

  async function updateField(field: string, value: any) {
    await fetch(`/api/admin/tenants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    })
    setData((prev: any) => ({ ...prev, tenant: { ...prev.tenant, [field]: value } }))
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh]"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
  }

  if (!data?.tenant) return <p className="text-red-500 text-sm">Tenant no encontrado</p>

  const { tenant, users: tenantUsers, subscription, botInstances, recentAppointments, recentMessages, recentPayments } = data

  function mask(val: string | null | undefined) {
    if (!val) return "—"
    if (showSecrets) return val
    return val.slice(0, 6) + "••••••" + val.slice(-4)
  }

  return (
    <div>
      <a href="/admin/tenants" className="text-sm text-slate-500 hover:text-teal-600 mb-4 inline-flex items-center gap-1">
        <ArrowLeft className="w-3.5 h-3.5" /> Volver a tenants
      </a>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6" /> {tenant.name}
          </h1>
          <p className="text-sm text-slate-500 font-mono">{tenant.slug} &middot; {tenant.id.slice(0, 8)}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={tenant.provisioningStatus}
            onChange={e => updateField("provisioningStatus", e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5"
          >
            <option value="draft">Draft</option>
            <option value="pending_plan">Pending Plan</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
          <select
            value={tenant.plan || "basico"}
            onChange={e => updateField("plan", e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5"
          >
            <option value="basico">Basico</option>
            <option value="profesional">Profesional</option>
            <option value="premium">Premium</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Info */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Información General</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <dt className="text-slate-500">Tipo</dt><dd className="text-slate-900">{tenant.tenantType}</dd>
              <dt className="text-slate-500">Plan</dt><dd className="text-slate-900 capitalize">{tenant.plan}</dd>
              <dt className="text-slate-500">Status</dt><dd className="text-slate-900">{tenant.provisioningStatus}</dd>
              <dt className="text-slate-500">Creado</dt><dd className="text-slate-900">{tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString("es-MX") : "—"}</dd>
              <dt className="text-slate-500">Subdominio</dt><dd className="text-slate-900 font-mono text-xs">{tenant.publicSubdomain || "—"}</dd>
            </dl>
          </div>

          {/* Bot Instances */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-700">Bot Instances</h2>
              <button onClick={() => setShowSecrets(s => !s)} className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">
                {showSecrets ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {showSecrets ? "Ocultar" : "Mostrar"} secrets
              </button>
            </div>
            {botInstances.length === 0 ? (
              <p className="text-sm text-slate-400">Sin bot instances</p>
            ) : (
              <div className="space-y-3">
                {botInstances.map((b: any) => (
                  <div key={b.id} className="border border-slate-100 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-slate-700 uppercase">{b.channel}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{b.provider}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${b.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>{b.status}</span>
                    </div>
                    <dl className="grid grid-cols-1 gap-1 text-xs">
                      <div className="flex gap-2"><dt className="text-slate-400 w-32">Phone Number ID</dt><dd className="font-mono text-slate-600">{mask(b.externalPhoneNumberId)}</dd></div>
                      <div className="flex gap-2"><dt className="text-slate-400 w-32">Bot ID</dt><dd className="font-mono text-slate-600">{mask(b.externalBotId)}</dd></div>
                    </dl>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Config JSON */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-700">Config JSON</h2>
              <button onClick={saveConfig} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 disabled:opacity-50">
                <Save className="w-3 h-3" /> {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
            {configError && <p className="text-xs text-red-500 mb-2">{configError}</p>}
            <textarea
              value={configJson}
              onChange={e => setConfigJson(e.target.value)}
              rows={16}
              className="w-full font-mono text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
              spellCheck={false}
            />
          </div>

          {/* Recent Messages */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Últimos Mensajes</h2>
            {recentMessages.length === 0 ? (
              <p className="text-sm text-slate-400">Sin mensajes</p>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {recentMessages.map((m: any) => (
                  <div key={m.id} className={`text-xs py-1.5 px-2 rounded ${m.direction === "inbound" ? "bg-blue-50" : "bg-slate-50"}`}>
                    <span className={`font-medium ${m.direction === "inbound" ? "text-blue-600" : "text-slate-600"}`}>
                      {m.direction === "inbound" ? "IN" : "OUT"}
                    </span>
                    <span className="text-slate-400 mx-1.5">{m.senderType}</span>
                    <span className="text-slate-700">{(m.content || "").slice(0, 100)}{(m.content || "").length > 100 ? "..." : ""}</span>
                    <span className="text-slate-300 ml-2">{m.createdAt ? new Date(m.createdAt).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Subscription */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Suscripción</h2>
            {subscription ? (
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between"><dt className="text-slate-500">Plan</dt><dd className="font-medium capitalize">{subscription.plan}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd className="font-medium">{subscription.status}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Monto</dt><dd className="font-mono">${Number(subscription.amount || 0).toLocaleString()} {subscription.currency}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Ciclo</dt><dd>{subscription.billingCycle}</dd></div>
              </dl>
            ) : (
              <p className="text-sm text-slate-400">Sin suscripción</p>
            )}
          </div>

          {/* Users */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><Users className="w-4 h-4" /> Usuarios ({tenantUsers.length})</h2>
            <div className="space-y-2">
              {tenantUsers.map((u: any) => (
                <div key={u.id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{u.name || u.email}</p>
                    <p className="text-[10px] text-slate-400">{u.email}</p>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{u.role}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Appointments */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><CalendarDays className="w-4 h-4" /> Últimas Citas</h2>
            {recentAppointments.length === 0 ? (
              <p className="text-sm text-slate-400">Sin citas</p>
            ) : (
              <div className="space-y-1.5">
                {recentAppointments.map((a: any) => (
                  <div key={a.id} className="flex justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                    <span className="text-slate-700">{a.date} {a.startTime?.slice(0, 5)}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${a.status === "completed" ? "bg-emerald-50 text-emerald-600" : a.status === "cancelled" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}>{a.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Payments */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><CreditCard className="w-4 h-4" /> Últimos Pagos</h2>
            {recentPayments.length === 0 ? (
              <p className="text-sm text-slate-400">Sin pagos</p>
            ) : (
              <div className="space-y-1.5">
                {recentPayments.map((p: any) => (
                  <div key={p.id} className="flex justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                    <span className="font-mono text-slate-700">${Number(p.amount || 0).toLocaleString()}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${p.status === "paid" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>{p.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
