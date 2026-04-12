'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { Users, Plus, X, Shield, Eye, Wrench, Trash2 } from 'lucide-react'

type Member = {
  id: string
  email: string
  name: string | null
  role: string | null
  createdAt: string
}

const ROLE_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  admin: { label: 'Admin', color: 'bg-indigo-50 text-indigo-700', icon: Shield },
  operator: { label: 'Operador', color: 'bg-amber-50 text-amber-700', icon: Wrench },
  viewer: { label: 'Solo lectura', color: 'bg-gray-50 text-gray-700', icon: Eye },
}

export default function TeamPage() {
  const [team, setTeam] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('operator')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTeam = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/settings/team')
      const data = await res.json()
      if (data.team) setTeam(data.team)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { fetchTeam() }, [fetchTeam])

  async function inviteMember() {
    if (!inviteEmail.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/dashboard/settings/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })
      if (res.ok) {
        setShowInvite(false)
        setInviteEmail('')
        setInviteRole('operator')
        fetchTeam()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Error al invitar miembro')
      }
    } catch {
      setError('Error de conexión')
    }
    setSaving(false)
  }

  async function changeRole(id: string, role: string) {
    try {
      await fetch(`/api/dashboard/settings/team/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      fetchTeam()
    } catch {}
  }

  async function removeMember(id: string) {
    if (!confirm('Estas seguro de eliminar este miembro?')) return
    try {
      await fetch(`/api/dashboard/settings/team/${id}`, { method: 'DELETE' })
      fetchTeam()
    } catch {}
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            Equipo
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestiona los miembros de tu equipo y sus roles</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Invitar miembro
        </button>
      </div>

      {showInvite && (
        <div className="bg-white rounded-xl border border-indigo-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Invitar nuevo miembro</h3>
            <button onClick={() => setShowInvite(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="email@ejemplo.com"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            >
              <option value="admin">Admin</option>
              <option value="operator">Operador</option>
              <option value="viewer">Solo lectura</option>
            </select>
            <button
              onClick={inviteMember}
              disabled={saving || !inviteEmail.trim()}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Email</th>
              <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Nombre</th>
              <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Rol</th>
              <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Fecha</th>
              <th className="text-right text-xs font-medium text-gray-500 px-5 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {team.map(member => {
              const roleInfo = ROLE_LABELS[member.role || 'admin'] || ROLE_LABELS.admin
              return (
                <tr key={member.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-3 text-sm text-gray-900">{member.email}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">{member.name || '-'}</td>
                  <td className="px-5 py-3">
                    <select
                      value={member.role || 'admin'}
                      onChange={e => changeRole(member.id, e.target.value)}
                      className={`text-xs font-medium px-2 py-1 rounded-lg border-0 ${roleInfo.color}`}
                    >
                      <option value="admin">Admin</option>
                      <option value="operator">Operador</option>
                      <option value="viewer">Solo lectura</option>
                    </select>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-400">
                    {member.createdAt ? new Date(member.createdAt).toLocaleDateString('es-MX') : '-'}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => removeMember(member.id)}
                      className="text-gray-400 hover:text-red-500 p-1"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
