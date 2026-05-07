/**
 * Safe wrapper for reading auth cookies.
 *
 * History:
 *   - Originally written for `@supabase/ssr@0.3.x` which could not parse
 *     cookie values written in the newer `base64-...` format. Feeding such
 *     a value into `cookies.get()` crashed `r$._recoverAndRefresh` with
 *     `TypeError: Cannot create property 'user' on string 'base64-...'`,
 *     hanging the Node event loop at 100% CPU. The defensive fix at the
 *     time was to *drop* base64-prefixed values so the user re-authenticated.
 *
 *   - Since we upgraded to `@supabase/ssr@0.10.x` (commit 357f19b), the
 *     library natively handles base64-prefixed cookies. The OLD defensive
 *     stripping started silently rejecting every valid session — login
 *     succeeded against Supabase, the cookie was written as
 *     `base64-eyJhY2Nlc3NfdG9rZW4iOi...`, and the very next request
 *     dropped it. Net effect: doctors logged in but landed back on /login.
 *
 * Current behavior: pass the value through unchanged. The newer ssr
 * package decodes it correctly. The signature is preserved (still wraps
 * `request.cookies.get(name)?.value` for null safety) so call sites don't
 * need to change.
 */
export function safeGetAuthCookie(value: string | undefined): string | undefined {
  return value || undefined
}
