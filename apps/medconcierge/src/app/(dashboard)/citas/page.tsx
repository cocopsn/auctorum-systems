'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { CitasClient } from './citas-client'

export default function CitasPage() {
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTenant = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/citas')
      if (!res.ok) throw new Error('Error al cargar citas')
      const data = await res.json()
      setTenantId(data.tenantId)
    } catch (err: any) {
      setError(err?.message || 'Error al cargar citas')
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchTenant() }, [fetchTenant])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (error || !tenantId) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-sm text-red-600">{error || 'Error al cargar citas'}</p>
      </div>
    )
  }

  return <CitasClient tenantId={tenantId} />
}
