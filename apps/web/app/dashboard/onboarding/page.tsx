'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist'
import { WelcomeBanner } from '@/components/dashboard/WelcomeBanner'

export default function OnboardingPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/onboarding')
      if (!res.ok) throw new Error('Error al cargar onboarding')
      const json = await res.json()
      setData(json)
    } catch (err: any) {
      setError(err?.message || 'Error al cargar onboarding')
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

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-sm text-red-600">{error || 'Error al cargar'}</p>
      </div>
    )
  }

  return (
    <>
      {data.showWelcome && (
        <WelcomeBanner tenantName={data.tenantName} userName={data.userName} />
      )}
      <OnboardingChecklist
        initialSteps={data.initialSteps}
        completedAt={data.completedAt}
        tenantName={data.tenantName}
      />
    </>
  )
}
