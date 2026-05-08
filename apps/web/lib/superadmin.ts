/**
 * Superadmin auth gate. Used by `/superadmin/*` pages and `/api/admin/*`
 * routes that expose multi-tenant operational data (queue metrics, global
 * AI usage, all integrations, etc.).
 *
 * Allowlist source:  process.env.SUPERADMIN_EMAILS  (comma-separated)
 * Falls back to a single hardcoded email so that even if the env var is
 * misconfigured the prod surface stays locked rather than wide-open.
 *
 * Returns:
 *   - the authed { user, tenant } if the caller is in the allowlist
 *   - a 403 NextResponse otherwise (never throws — keeps callers simple)
 */

import { NextResponse } from 'next/server'
import { redirect } from 'next/navigation'
import { getAuthTenant } from './auth'

function getAllowList(): string[] {
  const raw = process.env.SUPERADMIN_EMAILS ?? ''
  const list = raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0)
  // Fallback hardcoded BDFL — keeps prod locked when env is missing.
  if (list.length === 0) list.push('armando@auctorum.com.mx')
  return list
}

export async function requireSuperadmin() {
  const auth = await getAuthTenant()
  if (!auth) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const email = (auth.user.email ?? '').toLowerCase()
  if (!getAllowList().includes(email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return auth
}

/**
 * Server-component flavor — used by /superadmin/page.tsx. Redirects to
 * /dashboard for non-allowlisted users (don't reveal the page exists).
 */
export async function requireSuperadminPage() {
  const auth = await getAuthTenant()
  if (!auth) redirect('/login')
  const email = (auth.user.email ?? '').toLowerCase()
  if (!getAllowList().includes(email)) redirect('/dashboard')
  return auth
}
