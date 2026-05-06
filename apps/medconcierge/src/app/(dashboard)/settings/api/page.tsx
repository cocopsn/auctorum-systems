'use client'

import { useEffect, useState } from 'react'
import { Copy, KeyRound, Loader2, Plus, Trash2 } from 'lucide-react'

type ApiKeyRow = {
  id: string
  name: string
  keyPrefix: string
  permissions: string[]
  rateLimit: number
  lastUsedAt: string | null
  expiresAt: string | null
  isActive: boolean
  revokedAt: string | null
  createdAt: string
}

type CreateResponse = {
  data: ApiKeyRow
  key: string // plaintext, returned ONCE
}

const PERMISSION_OPTIONS = [
  { value: 'read',   label: 'Leer (GET)' },
  { value: 'write',  label: 'Escribir (POST, PATCH)' },
  { value: 'delete', label: 'Borrar (DELETE)' },
] as const

export default function ApiKeysSettingsPage() {
  const [rows, setRows] = useState<ApiKeyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPerms, setNewPerms] = useState<string[]>(['read'])
  const [newRateLimit, setNewRateLimit] = useState(100)
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard/api-keys')
      if (!res.ok) throw new Error(await res.text())
      const json = await res.json()
      setRows(json.data ?? [])
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (newName.trim().length < 2) {
      setError('El nombre debe tener al menos 2 caracteres.')
      return
    }
    if (newPerms.length === 0) {
      setError('Selecciona al menos un permiso.')
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/dashboard/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), permissions: newPerms, rateLimit: newRateLimit }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? 'Error al crear la API key')
      }
      const json: CreateResponse = await res.json()
      setCreatedKey(json.key)
      setShowForm(false)
      setNewName('')
      setNewPerms(['read'])
      setNewRateLimit(100)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setCreating(false)
    }
  }

  async function handleRevoke(id: string, name: string) {
    if (!confirm(`¿Revocar la API key "${name}"? Las integraciones que la usen dejarán de funcionar.`)) return
    try {
      const res = await fetch(`/api/dashboard/api-keys/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function togglePerm(p: string) {
    setNewPerms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]))
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <KeyRound className="w-5 h-5" /> API Keys
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Genera credenciales para integraciones externas (laboratorios, farmacias, sistemas hospitalarios).
            Cada key está asociada a tu consultorio y los datos se filtran automáticamente.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Documentación: <a href="/api-docs" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">/api-docs</a>
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => { setShowForm(true); setCreatedKey(null) }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" /> Nueva Key
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Plaintext key shown once */}
      {createdKey && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-lg">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <h3 className="text-sm font-semibold text-amber-900">Tu nueva API key</h3>
              <p className="text-xs text-amber-700 mt-0.5">
                Cópiala ahora — no podrás volver a verla. Si la pierdes, tendrás que crear una nueva.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCreatedKey(null)}
              className="text-xs text-amber-700 hover:text-amber-900"
            >
              Ya la copié
            </button>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono text-xs bg-white border border-amber-200 rounded px-3 py-2 select-all break-all">
              {createdKey}
            </code>
            <button
              type="button"
              onClick={() => { void navigator.clipboard.writeText(createdKey) }}
              className="inline-flex items-center gap-1 px-3 py-2 bg-amber-600 text-white rounded text-xs hover:bg-amber-700"
            >
              <Copy className="w-3.5 h-3.5" /> Copiar
            </button>
          </div>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nombre</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ej: Lab Integration, Pharmacy System"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              maxLength={100}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Permisos</label>
            <div className="flex flex-wrap gap-3">
              {PERMISSION_OPTIONS.map((p) => (
                <label key={p.value} className="inline-flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPerms.includes(p.value)}
                    onChange={() => togglePerm(p.value)}
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Rate limit (requests / hora) — entre 10 y 10,000
            </label>
            <input
              type="number"
              value={newRateLimit}
              onChange={(e) => setNewRateLimit(Number(e.target.value) || 100)}
              min={10}
              max={10000}
              className="w-32 border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 bg-indigo-600 text-white rounded text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generar API key'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setError('') }}
              className="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-100"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      {loading ? (
        <div className="py-12 text-center text-gray-500"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
      ) : rows.length === 0 ? (
        <div className="py-12 text-center border-2 border-dashed border-gray-200 rounded-lg">
          <KeyRound className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Aún no has creado API keys.</p>
          <p className="text-xs text-gray-400 mt-1">
            Documentación pública en <a className="text-indigo-600 underline" href="/api-docs" target="_blank" rel="noopener noreferrer">/api-docs</a>
          </p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="text-left px-4 py-2.5">Nombre</th>
                <th className="text-left px-4 py-2.5">Key</th>
                <th className="text-left px-4 py-2.5">Permisos</th>
                <th className="text-left px-4 py-2.5">Rate</th>
                <th className="text-left px-4 py-2.5">Último uso</th>
                <th className="text-left px-4 py-2.5">Estado</th>
                <th className="text-right px-4 py-2.5"> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => {
                const status = r.revokedAt
                  ? { label: 'Revocada', cls: 'bg-red-100 text-red-700' }
                  : r.expiresAt && new Date(r.expiresAt) < new Date()
                    ? { label: 'Expirada', cls: 'bg-gray-100 text-gray-600' }
                    : { label: 'Activa', cls: 'bg-green-100 text-green-700' }
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{r.name}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{r.keyPrefix}…</td>
                    <td className="px-4 py-2.5 text-xs text-gray-600">
                      {Array.isArray(r.permissions) ? r.permissions.join(', ') : 'read'}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{r.rateLimit}/h</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">
                      {r.lastUsedAt ? new Date(r.lastUsedAt).toLocaleString('es-MX') : 'Nunca'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${status.cls}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {!r.revokedAt && (
                        <button
                          type="button"
                          onClick={() => void handleRevoke(r.id, r.name)}
                          className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Revocar
                        </button>
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
