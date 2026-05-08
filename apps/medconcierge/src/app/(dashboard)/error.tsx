'use client'

/**
 * Dashboard-level error boundary. When ANY page inside the (dashboard) group
 * throws during render, Next.js mounts this component instead of dropping a
 * blank "Application error: a client-side exception has occurred" overlay.
 *
 * The user can:
 *   1. See what broke (subject + redacted message — no stack trace, no
 *      env vars, no cookies — surfacing those in a customer UI is its own
 *      security incident)
 *   2. Hit "Reintentar" → calls `reset()` which re-renders the page subtree
 *   3. Navigate elsewhere (the AppShell sidebar is preserved)
 *
 * The actual stack is sent to PM2 logs via `console.error` so we have it
 * server-side for triage.
 */

import { useEffect } from 'react'
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Logs are captured by PM2 (stdout) — searchable via `pm2 logs auctorum-medconcierge`.
    console.error('[dashboard error boundary]', {
      message: error.message,
      digest: error.digest,
      stack: error.stack?.split('\n').slice(0, 6).join('\n'),
    })
  }, [error])

  // Heuristic: don't show raw error.message in prod — it can leak SQL
  // identifiers or server paths. Always surface a friendly message and
  // keep the digest for support to look up in logs.
  const safeMessage =
    process.env.NODE_ENV === 'development'
      ? error.message
      : 'Algo salió mal al cargar esta sección.'

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h1 className="mt-4 text-lg font-semibold text-slate-900">No pudimos mostrar esta página</h1>
      <p className="mt-1 max-w-md text-sm text-slate-600">{safeMessage}</p>
      {error.digest && (
        <p className="mt-2 font-mono text-[11px] text-slate-400">
          Código de incidente: {error.digest}
        </p>
      )}
      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          <RefreshCcw className="h-4 w-4" />
          Reintentar
        </button>
        <a
          href="/agenda"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Home className="h-4 w-4" />
          Ir al dashboard
        </a>
      </div>
    </div>
  )
}
