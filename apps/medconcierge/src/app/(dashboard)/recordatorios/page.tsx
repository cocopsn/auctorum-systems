'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { RecordatoriosTable } from '@/components/dashboard/recordatorios-table'

export default function RecordatoriosPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/recordatorios')
      if (!res.ok) throw new Error('Error al cargar recordatorios')
      const data = await res.json()
      setRows(data.rows || [])
    } catch (err: any) {
      setError(err?.message || 'Error al cargar recordatorios')
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
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

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Recordatorios</h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-0.5">
          Citas próximas (hoy y siguientes 48h) y estado de envío de recordatorios automáticos.
        </p>
      </div>
      <RecordatoriosTable rows={rows} />
    </div>
  )
}
