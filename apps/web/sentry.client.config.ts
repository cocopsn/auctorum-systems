/**
 * Sentry browser-side config — web (B2B Quote Engine).
 *
 * Auto-disabled when NEXT_PUBLIC_SENTRY_DSN is unset. Mirrors
 * apps/medconcierge/sentry.client.config.ts — see there for full
 * rationale. PII redaction is less strict here than medconcierge
 * (no PHI on the B2B side) but quote bodies + customer addresses
 * are still stripped.
 */
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment:
    process.env.NEXT_PUBLIC_SENTRY_ENV ?? process.env.NODE_ENV ?? 'production',
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  beforeSend(event) {
    if (event.request) {
      if (event.request.data) event.request.data = '[REDACTED]'
      if (event.request.cookies) delete event.request.cookies
      if (event.request.headers) {
        const safe: Record<string, string> = {}
        for (const [k, v] of Object.entries(
          event.request.headers as Record<string, string>,
        )) {
          if (/^(authorization|cookie|x-auth|x-csrf|x-api-key)$/i.test(k)) continue
          safe[k] = typeof v === 'string' ? v.slice(0, 200) : '[redacted]'
        }
        event.request.headers = safe
      }
    }
    if (event.user) {
      delete event.user.email
      delete event.user.ip_address
    }
    return event
  },
})
