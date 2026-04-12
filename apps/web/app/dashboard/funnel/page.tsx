'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { GitBranch, Phone, MoreHorizontal, ArrowRight, Users, TrendingUp, XCircle } from 'lucide-react'

type Stage = {
  id: string
  name: string
  color: string
  position: number
  clientCount: number
}

type FunnelClient = {
  id: string
  name: string
  phone: string | null
  email: string | null
  company: string | null
  totalQuotes: number | null
  createdAt: string
  stageId: string | null
}

export default function FunnelPage() {
  const [stages, setStages] = useState<Stage[]>([])
  const [clients, setClients] = useState<FunnelClient[]>([])
  const [loading, setLoading] = useState(true)
  const [movingClient, setMovingClient] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/funnel')
      if (!res.ok) throw new Error('Error al cargar embudo')
      const data = await res.json()
      if (data.stages) setStages(data.stages)
      if (data.clients) setClients(data.clients)
    } catch (err: any) {
      setError(err?.message || 'Error al cargar embudo')
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function moveClient(clientId: string, stageId: string) {
    setMovingClient(clientId)
    try {
      const res = await fetch('/api/dashboard/funnel/move', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, stageId }),
      })
      if (res.ok) {
        setClients(prev => prev.map(c =>
          c.id === clientId ? { ...c, stageId } : c
        ))
      }
    } catch {}
    setMovingClient(null)
    setMenuOpen(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    )
  }

  const firstStage = stages[0]
  const attendedStage = stages.find(s => s.name === 'Atendido')
  const lostStage = stages.find(s => s.name === 'Perdido')
  const totalClients = clients.length
  const attendedCount = attendedStage ? clients.filter(c => c.stageId === attendedStage.id).length : 0
  const lostCount = lostStage ? clients.filter(c => c.stageId === lostStage.id).length : 0
  const conversionRate = totalClients > 0 ? Math.round((attendedCount / totalClients) * 100) : 0

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-indigo-600" />
          Embudo de Ventas
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Visualiza y gestiona el progreso de tus clientes</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Users className="h-4 w-4" /> Total clientes
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalClients}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <TrendingUp className="h-4 w-4" /> Conversion
          </div>
          <p className="text-2xl font-bold text-gray-900">{conversionRate}%</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <XCircle className="h-4 w-4" /> Perdidos
          </div>
          <p className="text-2xl font-bold text-gray-900">{lostCount}</p>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map(stage => {
          const stageClients = clients.filter(c => c.stageId === stage.id)
          const unassigned = stage.position === 0
            ? clients.filter(c => !c.stageId)
            : []
          const allClients = [...stageClients, ...unassigned]

          return (
            <div key={stage.id} className="flex-shrink-0 w-72">
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                  <h3 className="text-sm font-semibold text-gray-900 flex-1">{stage.name}</h3>
                  <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                    {allClients.length}
                  </span>
                </div>
                <div className="p-2 space-y-2 max-h-[60vh] overflow-y-auto min-h-[100px]">
                  {allClients.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">Sin clientes</p>
                  )}
                  {allClients.map(client => (
                    <div
                      key={client.id}
                      className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors relative"
                    >
                      <p className="text-sm font-medium text-gray-900 truncate">{client.name}</p>
                      {client.phone && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3" /> {client.phone}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-gray-400">
                          {client.createdAt ? new Date(client.createdAt).toLocaleDateString('es-MX') : '-'}
                        </span>
                        {client.totalQuotes != null && Number(client.totalQuotes) > 0 && (
                          <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">
                            {client.totalQuotes} cotiz.
                          </span>
                        )}
                      </div>

                      <div className="mt-2 relative">
                        <button
                          onClick={() => setMenuOpen(menuOpen === client.id ? null : client.id)}
                          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700"
                        >
                          <ArrowRight className="h-3 w-3" /> Mover
                        </button>
                        {menuOpen === client.id && (
                          <div className="absolute left-0 top-6 z-10 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px]">
                            {stages.filter(s => s.id !== stage.id).map(s => (
                              <button
                                key={s.id}
                                onClick={() => moveClient(client.id, s.id)}
                                disabled={movingClient === client.id}
                                className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
                              >
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                                {s.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
