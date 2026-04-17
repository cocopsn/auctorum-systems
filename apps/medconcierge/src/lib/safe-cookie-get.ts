/**
 * Safe wrapper for reading auth cookies.
 *
 * Background: @supabase/ssr@0.3.0 cannot parse cookie values written in the
 * newer `base64-...` format (as emitted by newer @supabase/supabase-js clients
 * when the session payload is large). Feeding such a value into
 * `cookies.get()` causes `r$._recoverAndRefresh` to crash with
 * `TypeError: Cannot create property 'user' on string 'base64-...'`,
 * which in async contexts hangs the Node event loop at 100% CPU.
 *
 * Defensive strategy: if we detect a base64-prefixed cookie value, treat the
 * cookie as absent. Supabase will see "no session" and skip recovery,
 * allowing the user to re-authenticate cleanly.
 */
export function safeGetAuthCookie(value: string | undefined): string | undefined {
  if (!value) return undefined
  if (value.startsWith('base64-')) return undefined
  return value
}
