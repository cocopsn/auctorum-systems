/**
 * Vitest setup — runs once before each test file.
 *
 * Sets safe defaults for env vars that some modules read at import time.
 * Real values come from `apps/medconcierge/.env.local` via dotenv when a
 * test deliberately needs them (the integrity script + e2e-vps tests),
 * NOT from this setup — we don't want unit tests accidentally hitting
 * real services.
 */

// Stub env so module-level reads don't throw. Tests that need real env
// vars (integration / e2e) load .env.local explicitly via dotenv.
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key'
process.env.NEXT_PUBLIC_APP_DOMAIN ??= 'auctorum.com.mx'

// Suppress noisy console.warn from fail-soft helpers (rate-limit when
// Redis is down, web-push when VAPID is unset, etc.) — we test their
// behavior, not their logging.
const ORIGINAL_WARN = console.warn
const SUPPRESSED = [
  '[rate-limit]',
  '[web-push]',
  '[help-bot]',
  '[lead-autocontact]',
  '[document-analyzer]',
  '[meta-leads]',
  '[google-leads]',
  '[instagram]',
  '[notify-doctor]',
  '[patient-comms]',
  '[Push subscribe]',
]
console.warn = (...args: unknown[]) => {
  const first = args[0]
  if (typeof first === 'string' && SUPPRESSED.some((p) => first.includes(p))) return
  ORIGINAL_WARN(...args)
}
