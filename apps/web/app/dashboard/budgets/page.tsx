'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { Receipt, Plus, X, Check, Ban, Trash2 } from 'lucide-react'

type BudgetItem = { name: string; qty: number; price: number }
type Budget = {
  id: string
  folio: string
  client_name: string | null
  patient_name: string | null
  items: BudgetItem[]
  subtotal: string
  tax: string
  total: string
  status: string
  notes: string | null
  valid_until: string | null
  created_at: string
}

type SimpleClient = { id: string; name: string }

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-amber-50 text-amber-700' },
  approved: { label: 'Aprobado', color: 'bg-blue-50 text-blue-700' },
  paid: { label: 'Pagado', color: 'bg-green-50 text-green-700' },
  cancelled: { label: 'Cancelado', color: 'bg-gray-50 text-gray-500' },
}

function formatMXN(n: number | string) {
  return '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [clients, setClients] = useState<SimpleClient[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ clientId: '', notes: '', validUntil: '' })
  const [items, setItems] = useState<BudgetItem[]>([{ name: '', qty: 1, price: 0 }])
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [bRes, cRes] = await Promise.all([
        fetch(`/api/dashboard/budgets?status=${tab}`, { credentials: 'include' }),
        fetch('/api/dashboard/funnel', { credentials: 'include' }),
      ])
      const bData = await bRes.json()
      const cData = await cRes.json()
      if (bData.budgets) setBudgets(bData.budgets)
      if (cData.clients) setClients(cData.clients.map((c: any) => ({ id: c.id, name: c.name })))
    } catch {}
    setLoading(false)
  }, [tab])

  useEffect(() => { fetchData() }, [fetchData])

  function updateItem(i: number, field: keyof BudgetItem, value: any) {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }

  function addItem() { setItems(prev => [...prev, { name: '', qty: 1, price: 0 }]) }
  function removeItem(i: number) { setItems(prev => prev.filter((_, idx) => idx !== i)) }

  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0)
  const tax = Math.round(subtotal * 0.16 * 100) / 100
  const total = Math.round((subtotal + tax) * 100) / 100

  async function createBudget() {
    const validItems = items.filter(i => i.name.trim() && i.qty > 0 && i.price > 0)
    if (validItems.length === 0) return
    setSaving(true)
    try {
      const res = await fetch('/api/dashboard/budgets', {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: form.clientId || undefined,
          items: validItems,
          notes: form.notes || undefined,
          validUntil: form.validUntil || undefined,
        }),
      })
      if (res.ok) {
        setShowForm(false)
        setForm({ clientId: '', notes: '', validUntil: '' })
        setItems([{ name: '', qty: 1, price: 0 }])
        fetchData()
      }
    } catch {}
    setSaving(false)
  }

  async function updateStatus(id: string, status: string) {
    try {
      await fetch(`/api/dashboard/budgets/${id}/status`, {
        credentials: 'include',
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      fetchData()
    } catch {}
  }

  const tabs = [
    { key: 'all', label: 'Todos' },
    { key: 'pending', label: 'Pendientes' },
    { key: 'approved', label: 'Aprobados' },
    { key: 'paid', label: 'Pagados' },
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
            <Receipt className="h-5 w-5 text-indigo-600" />
            Presupuestos
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Crea y gestiona presupuestos para tus clientes</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus className="h-4 w-4" /> Nuevo presupuesto
        </button>
      </div>

      <div className="flex gap-1 mb-4">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === t.key ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-indigo-200 p-5 mb-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Nuevo presupuesto</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
          </div>
          <select value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
            <option value="">Seleccionar cliente (opcional)</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_80px_100px_40px] gap-2 text-xs font-medium text-gray-500">
              <span>Concepto</span><span>Cant.</span><span>Precio</span><span></span>
            </div>
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_100px_40px] gap-2">
                <input value={item.name} onChange={e => updateItem(i, 'name', e.target.value)} placeholder="Nombre del item" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                <input type="number" value={item.qty} onChange={e => updateItem(i, 'qty', Number(e.target.value))} min={1} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                <input type="number" value={item.price} onChange={e => updateItem(i, 'price', Number(e.target.value))} min={0} step={0.01} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                <button onClick={() => removeItem(i)} className="text-gray-400 hover:text-red-500 flex items-center justify-center"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
            <button onClick={addItem} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">+ Agregar item</button>
          </div>

          <div className="text-right text-sm space-y-1 border-t border-gray-100 pt-3">
            <p className="text-gray-500">Subtotal: {formatMXN(subtotal)}</p>
            <p className="text-gray-500">IVA (16%): {formatMXN(tax)}</p>
            <p className="font-semibold text-gray-900">Total: {formatMXN(total)}</p>
          </div>

          <div className="flex gap-3">
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notas (opcional)" rows={2} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" />
            <div>
              <label className="block text-xs text-gray-500 mb-1">Vigencia</label>
              <input type="date" value={form.validUntil} onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
          </div>

          <button onClick={createBudget} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Creando...' : 'Crear presupuesto'}
          </button>
        </div>
      )}

      {budgets.length === 0 ? (
        <div className="text-center py-12">
          <Receipt className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No hay presupuestos. Crea el primero.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Folio</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Cliente</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Items</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Total</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Estado</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Fecha</th>
                <th className="text-right text-xs font-medium text-gray-500 px-5 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {budgets.map(b => {
                const statusInfo = STATUS_MAP[b.status] || STATUS_MAP.pending
                const itemsArr = Array.isArray(b.items) ? b.items : []
                return (
                  <tr key={b.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-3 text-sm font-mono text-gray-900">{b.folio}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{b.client_name || b.patient_name || '-'}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{itemsArr.length} items</td>
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">{formatMXN(b.total)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-lg ${statusInfo.color}`}>{statusInfo.label}</span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-400">{b.created_at ? new Date(b.created_at).toLocaleDateString('es-MX') : '-'}</td>
                    <td className="px-5 py-3 text-right space-x-1">
                      {b.status === 'pending' && (
                        <>
                          <button onClick={() => updateStatus(b.id, 'approved')} className="text-blue-500 hover:text-blue-700 p-1 text-xs" title="Aprobar"><Check className="h-4 w-4" /></button>
                          <button onClick={() => updateStatus(b.id, 'cancelled')} className="text-gray-400 hover:text-red-500 p-1" title="Cancelar"><Ban className="h-4 w-4" /></button>
                        </>
                      )}
                      {b.status === 'approved' && (
                        <button onClick={() => updateStatus(b.id, 'paid')} className="text-green-500 hover:text-green-700 p-1 text-xs" title="Marcar pagado"><Check className="h-4 w-4" /></button>
                      )}
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
