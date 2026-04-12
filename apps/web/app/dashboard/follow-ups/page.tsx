'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { Heart, Plus, X, Check, Ban, Trash2, Calendar } from 'lucide-react'

type FollowUp = {
  id: string
  type: string
  status: string
  scheduledAt: string
  sentAt: string | null
  messageTemplate: string | null
  clientName: string | null
  clientPhone: string | null
  clientId: string
}

type SimpleClient = { id: string; name: string }

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  scheduled: { label: 'Programado', color: 'bg-blue-50 text-blue-700' },
  sent: { label: 'Enviado', color: 'bg-green-50 text-green-700' },
  responded: { label: 'Respondido', color: 'bg-emerald-50 text-emerald-700' },
  cancelled: { label: 'Cancelado', color: 'bg-gray-50 text-gray-500' },
}

const TYPE_MAP: Record<string, string> = {
  post_appointment: 'Post-cita',
  recall: 'Recall',
  quote_followup: 'Seguimiento cotizacion',
  custom: 'Personalizado',
}

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [clients, setClients] = useState<SimpleClient[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ clientId: '', type: 'custom', scheduledAt: '', messageTemplate: '' })
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [fuRes, clRes] = await Promise.all([
        fetch(`/api/dashboard/follow-ups?status=${tab}`, { credentials: 'include' }),
        fetch('/api/dashboard/funnel', { credentials: 'include' }),
      ])
      const fuData = await fuRes.json()
      const clData = await clRes.json()
      if (fuData.followUps) setFollowUps(fuData.followUps)
      if (clData.clients) setClients(clData.clients.map((c: any) => ({ id: c.id, name: c.name })))
    } catch {}
    setLoading(false)
  }, [tab])

  useEffect(() => { fetchData() }, [fetchData])

  async function createFollowUp() {
    if (!form.clientId || !form.scheduledAt) return
    setSaving(true)
    try {
      const res = await fetch('/api/dashboard/follow-ups', {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setShowForm(false)
        setForm({ clientId: '', type: 'custom', scheduledAt: '', messageTemplate: '' })
        fetchData()
      }
    } catch {}
    setSaving(false)
  }

  async function updateStatus(id: string, status: string) {
    try {
      await fetch(`/api/dashboard/follow-ups/${id}`, {
        credentials: 'include',
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      fetchData()
    } catch {}
  }

  async function deleteFollowUp(id: string) {
    if (!confirm('Eliminar este seguimiento?')) return
    try {
      await fetch(`/api/dashboard/follow-ups/${id}`, { credentials: 'include', method: 'DELETE' })
      fetchData()
    } catch {}
  }

  const tabs = [
    { key: 'all', label: 'Todos' },
    { key: 'scheduled', label: 'Programados' },
    { key: 'sent', label: 'Enviados' },
    { key: 'cancelled', label: 'Cancelados' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Heart className="h-5 w-5 text-indigo-600" />
            Seguimientos
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestiona recordatorios y seguimientos de clientes</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus className="h-4 w-4" /> Nuevo seguimiento
        </button>
      </div>

      <div className="flex gap-1 mb-4">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === t.key ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-indigo-200 p-5 mb-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Nuevo seguimiento</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
          </div>
          <select value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
            <option value="">Seleccionar cliente</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="flex gap-3">
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
              <option value="custom">Personalizado</option>
              <option value="post_appointment">Post-cita</option>
              <option value="recall">Recall</option>
              <option value="quote_followup">Seguimiento cotizacion</option>
            </select>
            <input type="datetime-local" value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <textarea value={form.messageTemplate} onChange={e => setForm(f => ({ ...f, messageTemplate: e.target.value }))} placeholder="Mensaje (opcional)" rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" />
          <button onClick={createFollowUp} disabled={saving || !form.clientId || !form.scheduledAt} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Creando...' : 'Crear seguimiento'}
          </button>
        </div>
      )}

      {followUps.length === 0 ? (
        <div className="text-center py-12">
          <Heart className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No hay seguimientos. Crea uno para empezar.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Cliente</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Tipo</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Estado</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Programado</th>
                <th className="text-right text-xs font-medium text-gray-500 px-5 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {followUps.map(fu => {
                const statusInfo = STATUS_MAP[fu.status] || STATUS_MAP.scheduled
                return (
                  <tr key={fu.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-3 text-sm text-gray-900">{fu.clientName || 'Sin nombre'}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{TYPE_MAP[fu.type] || fu.type}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-lg ${statusInfo.color}`}>{statusInfo.label}</span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">
                      {fu.scheduledAt ? new Date(fu.scheduledAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                    </td>
                    <td className="px-5 py-3 text-right space-x-1">
                      {fu.status === 'scheduled' && (
                        <>
                          <button onClick={() => updateStatus(fu.id, 'sent')} className="text-green-500 hover:text-green-700 p-1" title="Marcar enviado"><Check className="h-4 w-4" /></button>
                          <button onClick={() => updateStatus(fu.id, 'cancelled')} className="text-gray-400 hover:text-red-500 p-1" title="Cancelar"><Ban className="h-4 w-4" /></button>
                        </>
                      )}
                      <button onClick={() => deleteFollowUp(fu.id)} className="text-gray-400 hover:text-red-500 p-1" title="Eliminar"><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
