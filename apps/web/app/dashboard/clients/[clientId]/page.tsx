'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import ClientDetailClient from '@/components/dashboard/ClientDetailClient'

export default function ClientDetailPage() {
  const params = useParams()
  const clientId = params.clientId as string

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClient = useCallback(async () => {
    try {
      const res = await fetch(`/api/dashboard/clients/${clientId}`, { credentials: 'include' })
      if (res.status === 404) throw new Error('Cliente no encontrado')
      if (!res.ok) throw new Error('Error al cargar cliente')
      const json = await res.json()
      setData(json)
    } catch (err: any) {
      setError(err?.message || 'Error al cargar cliente')
    }
    setLoading(false)
  }, [clientId])

  useEffect(() => { fetchClient() }, [fetchClient])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-sm text-red-600">{error || 'Cliente no encontrado'}</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <ClientDetailClient
        client={data.client}
        quotes={data.quotes}
        folioPrefix={data.folioPrefix}
      />
    </div>
  )
}
