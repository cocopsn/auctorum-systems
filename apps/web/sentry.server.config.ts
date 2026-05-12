/**
 * Sentry server-side config — web. Mirror of medconcierge counterpart.
 */
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment:
    process.env.SENTRY_ENV ?? process.env.NODE_ENV ?? 'production',
  tracesSampleRate: 0.1,
  profilesSampleRate: 0,
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
    if (event.user) event.user = { id: event.user.id }
    return event
  },
})
