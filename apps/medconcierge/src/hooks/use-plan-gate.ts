'use client'

import { useCallback, useState } from 'react'

/**
 * Client-side wrapper around `fetch` that intercepts 402 responses with
 * `code: 'PLAN_LIMIT'`. The server contract is established in
 * `apps/medconcierge/src/lib/plan-gating.ts` and used by every gated
 * endpoint (campaigns/send, documents POST, v1 API, Stripe Connect,
 * Instagram DM settings, reports/export, etc.).
 *
 * Usage:
 *
 *   const { blockedFeature, clearBlock, fetchWithPlanGate } = usePlanGate()
 *
 *   async function loadCampaigns() {
 *     const res = await fetchWithPlanGate('/api/dashboard/campaigns')
 *     if (!res) return  // 402 intercepted, modal will show
 *     const data = await res.json()
 *     setCampaigns(data)
 *   }
 *
 *   return (
 *     <>
 *       {blockedFeature && (
 *         <UpgradePrompt feature={blockedFeature} onClose={clearBlock} />
 *       )}
 *       ...
 *     </>
 *   )
 */
export function usePlanGate() {
  const [blockedFeature, setBlockedFeature] = useState<string | null>(null)

  const fetchWithPlanGate = useCallback(
    async (
      url: string,
      options?: RequestInit,
    ): Promise<Response | null> => {
      const res = await fetch(url, options)

      if (res.status === 402) {
        // Clone so the caller can still read the body if it wants to log
        // the error. We consume the clone here.
        try {
          const data = (await res.clone().json()) as {
            code?: string
            feature?: string
          }
          if (data?.code === 'PLAN_LIMIT') {
            setBlockedFeature(data.feature ?? 'unknown')
            return null
          }
        } catch {
          // Body wasn't JSON — treat as a normal 402 and let the caller
          // handle it.
        }
      }

      return res
    },
    [],
  )

  const clearBlock = useCallback(() => setBlockedFeature(null), [])

  /**
   * Imperative trigger for callers that can't (or shouldn't) route
   * through `fetchWithPlanGate` — e.g. a wizard that calls two
   * endpoints back-to-back and wants to handle the 402 from the
   * second one manually. The campaign "create + send" form uses this
   * for the inner send fetch.
   */
  const setBlocked = useCallback((feature: string) => {
    setBlockedFeature(feature)
  }, [])

  return { blockedFeature, clearBlock, setBlocked, fetchWithPlanGate }
}
