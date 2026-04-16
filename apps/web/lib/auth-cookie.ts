const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'auctorum.com.mx'

/**
 * Returns the cookie domain that should be used so the auth session is shared
 * across every tenant subdomain (e.g. demo.auctorum.com.mx, dra-martinez.auctorum.com.mx,
 * and the apex auctorum.com.mx where /dashboard lives).
 *
 * In production: returns ".auctorum.com.mx" (leading dot makes it valid for any subdomain).
 * In dev/localhost: returns undefined so the browser falls back to host-only cookies,
 * which preserves the existing localhost behavior.
 */
export function getAuthCookieDomain(host: string | null | undefined): string | undefined {
  if (!host) return undefined
  const hostname = host.split(':')[0]
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.startsWith('127.') ||
    hostname === '0.0.0.0'
  ) {
    return undefined
  }
  if (hostname === APP_DOMAIN || hostname.endsWith(`.${APP_DOMAIN}`)) {
    return `.${APP_DOMAIN}`
  }
  return undefined
}

/**
 * Wraps a Supabase cookie options object to inject the shared auth cookie domain.
 * Pass-through if the helper decides no domain should be set (e.g. localhost).
 */
export function withAuthCookieDomain<T extends Record<string, unknown>>(
  options: T | undefined,
  host: string | null | undefined,
): T & { domain?: string } {
  const base = (options ?? {}) as T
  const domain = getAuthCookieDomain(host)
  if (!domain) return base
  return { ...base, domain }
}
