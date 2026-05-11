/**
 * Sentry server-side init (Node.js + Next.js routes). Twin of
 * sentry.client.config.ts — see there for activation steps + rationale.
 *
 * Captures unhandled exceptions in API routes, edge runtime crashes,
 * server-render errors. PII guard strips request body, cookies, sensitive
 * headers, and replaces the user object with just the id.
 */

// import * as Sentry from '@sentry/nextjs'
//
// const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN
//
// if (dsn) {
//   Sentry.init({
//     dsn,
//     environment: process.env.SENTRY_ENV ?? process.env.NODE_ENV ?? 'production',
//     tracesSampleRate: 0.1,
//     profilesSampleRate: 0,
//     beforeSend(event) {
//       if (event.request) {
//         if (event.request.data) event.request.data = '[redacted]'
//         if (event.request.cookies) event.request.cookies = '[redacted]'
//         if (event.request.headers) {
//           const safe: Record<string, string> = {}
//           for (const [k, v] of Object.entries(event.request.headers as Record<string, string>)) {
//             if (/^(authorization|cookie|x-auth|x-csrf|x-api-key)$/i.test(k)) continue
//             safe[k] = typeof v === 'string' ? v.slice(0, 200) : '[redacted]'
//           }
//           event.request.headers = safe
//         }
//       }
//       if (event.user) event.user = { id: event.user.id }
//       return event
//     },
//   })
// }

export {}
