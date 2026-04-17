'use client'

import { useState, useEffect } from 'react'
import type { TenantLandingData } from '@/lib/landing-data'
import LandingPage from '@/components/landing/LandingPage'

function getSlugFromHost(): string | null {
  if (typeof window === 'undefined') return null
  const host = window.location.hostname
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'auctorum.com.mx'

  if (host.includes('localhost')) {
    const parts = host.split('.')
    if (parts.length >= 2 && parts[0] !== 'localhost') return parts[0]
    return null
  }

  if (host.endsWith(appDomain)) {
    const sub = host.replace(`.${appDomain}`, '')
    if (/^(dr|dra|doc)-/.test(sub)) return sub
  }
  return null
}

export default function Home() {
  const [data, setData] = useState<TenantLandingData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const slug = getSlugFromHost()
    if (!slug) return

    fetch(`/api/landing-data?slug=${encodeURIComponent(slug)}`)
      .then(res => {
        if (!res.ok) throw new Error('Tenant not found')
        return res.json()
      })
      .then(setData)
      .catch(err => setError(err.message))
  }, [])

  const slug = typeof window !== 'undefined' ? getSlugFromHost() : null

  if (!slug) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Auctorum Systems</h1>
          <p className="text-slate-500">Plataforma médica SaaS</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">Tenant no encontrado</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse text-center">
          <div className="w-12 h-12 rounded-full bg-teal-200 mx-auto mb-4" />
          <div className="h-4 bg-slate-200 rounded w-48 mx-auto" />
        </div>
      </div>
    )
  }

  return <LandingPage data={data} />
}
