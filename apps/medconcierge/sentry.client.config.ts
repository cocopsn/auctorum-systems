/**
 * Sentry client-side init for medconcierge.
 *
 * NOT WIRED YET — to activate:
 *   1. corepack pnpm add @sentry/nextjs --filter medconcierge
 *   2. Set NEXT_PUBLIC_SENTRY_DSN in apps/medconcierge/.env.local
 *   3. Uncomment the import + Sentry.init block below
 *   4. Add `sentryWebpackPluginOptions` to next.config.js for source maps
 *
 * PII guard (when activated): `beforeSend` redacts request bodies,
 * cookies, and authorization headers — these often carry patient names,
 * phones, clinical notes. Stack + breadcrumbs still give debugging
 * signal without leaking PHI to Sentry's 30-day retention.
 *
 * P0-12 of the 2026-05-11 audit: production needs error tracking. This
 * file is the scaffolding so flipping the env var activates it.
 */

// import * as Sentry from '@sentry/nextjs'
//
// const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
//
// if (dsn) {
//   Sentry.init({
//     dsn,
//     environment: process.env.NEXT_PUBLIC_SENTRY_ENV ?? process.env.NODE_ENV ?? 'production',
//     tracesSampleRate: 0.1,
//     replaysSessionSampleRate: 0,
//     replaysOnErrorSampleRate: 0,
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
//       return event
//     },
//   })
// }

export {}
