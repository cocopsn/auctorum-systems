'use client'

/**
 * LFPDPPP-style cookie consent banner. Article 8 of the Mexican
 * Federal Law on Protection of Personal Data Held by Private Parties
 * requires informed prior consent for non-essential trackers.
 *
 * State lives in `localStorage` under `auctorum_cookie_consent` —
 * server doesn't track per-user choice (no extra request, no DB write).
 *
 * P2-2 of the 2026-05-12 audit. Mounted in the root layout so it
 * appears on landings + login (NOT in dashboard — by then the user is
 * authenticated and consented via TOS).
 */

import { useState, useEffect } from 'react'

type ConsentRecord = {
  essential: true
  analytics: boolean
  accepted_at: string
  version: 1
}

const STORAGE_KEY = 'auctorum_cookie_consent'

export function CookieConsent() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        setShow(true)
        return
      }
      const parsed = JSON.parse(raw) as Partial<ConsentRecord>
      // Re-prompt if the schema version doesn't match (lets us roll out
      // new categories without honoring stale opt-ins).
      if (parsed.version !== 1) setShow(true)
    } catch {
      setShow(true)
    }
  }, [])

  function persist(analytics: boolean) {
    const record: ConsentRecord = {
      essential: true,
      analytics,
      accepted_at: new Date().toISOString(),
      version: 1,
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
    } catch {
      /* private mode / disabled storage — banner just disappears for the session */
    }
    setShow(false)
  }

  if (!show) return null

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-consent-title"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white shadow-lg"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:px-6">
        <div className="flex-1 text-sm text-slate-700">
          <p className="font-medium text-slate-900" id="cookie-consent-title">
            Aviso de cookies
          </p>
          <p className="mt-1">
            Usamos cookies esenciales para mantener su sesión y, si lo acepta,
            cookies analíticas para medir el uso del sitio. Sus datos no se
            venden. Lea nuestra{' '}
            <a href="/cookies" className="text-teal-600 underline">
              Política de Cookies
            </a>{' '}
            y nuestro{' '}
            <a href="/privacy" className="text-teal-600 underline">
              Aviso de Privacidad
            </a>
            .
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => persist(false)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Solo esenciales
          </button>
          <button
            type="button"
            onClick={() => persist(true)}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            Aceptar todas
          </button>
        </div>
      </div>
    </div>
  )
}
