'use client'

import { useState, useEffect, useCallback } from 'react'
import { OnboardingWizard } from './onboarding-wizard'

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<'loading' | 'onboarding' | 'done'>('loading')

  const checkOnboarding = useCallback(async () => {
    try {
      const res = await fetch('/api/onboarding')
      if (!res.ok) {
        setState('done')
        return
      }
      const data = await res.json()
      setState(data.completed ? 'done' : 'onboarding')
    } catch {
      setState('done')
    }
  }, [])

  useEffect(() => { checkOnboarding() }, [checkOnboarding])

  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (state === 'onboarding') {
    return <OnboardingWizard onComplete={() => setState('done')} />
  }

  return <>{children}</>
}
