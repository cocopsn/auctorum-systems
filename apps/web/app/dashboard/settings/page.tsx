'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import SettingsClient from '@/components/dashboard/SettingsClient'
import type { TenantConfig } from '@quote-engine/db'

export default function SettingsPage() {
  const [data, setData] = useState<{ tenantSlug: string; tenantName: string; logoUrl: string; config: TenantConfig } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/settings/tenant')
      if (!res.ok) throw new Error('Error al cargar configuración')
      const json = await res.json()
      setData(json)
    } catch (err: any) {
      setError(err?.message || 'Error al cargar configuración')
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

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
        <p className="text-sm text-red-600">{error || 'No hay tenant configurado.'}</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Configuración</h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-0.5">Personalice su portal de cotizaciones</p>
      </div>
      <SettingsClient
        tenantSlug={data.tenantSlug}
        tenantName={data.tenantName}
        logoUrl={data.logoUrl}
        config={data.config}
      />
    </div>
  )
}
