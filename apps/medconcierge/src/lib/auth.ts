import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db, users, tenants } from '@quote-engine/db'
import type { Tenant, User } from '@quote-engine/db'

function createSupabaseServerClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Use the getAll API so chunked auth cookies (`sb-xxx-auth-token.0`,
      // `.1`, …) are visible. The legacy single-`get` API silently dropped
      // chunks > 4 KB and made `getUser()` return null on real sessions.
      cookies: {
        getAll() {
          try {
            return cookieStore.getAll().map((c) => ({ name: c.name, value: c.value }))
          } catch {
            return []
          }
        },
        // No setAll — server components can't write cookies; the middleware
        // and the /api/auth/callback route handle session writes.
        setAll() {
          /* noop */
        },
      },
    },
  )
}

export async function getSession() {
  try {
    const supabase = createSupabaseServerClient()
    // Use getUser() instead of getSession() — getUser() authenticates
    // against the Supabase Auth server rather than trusting cookie data.
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    // Return a session-like object for backwards compatibility
    return { user }
  } catch (err) {
    // Corrupted session cookie — treat as unauthenticated
    console.error('getSession error:', err instanceof Error ? err.message : err)
    return null
  }
}

export async function requireAuth(): Promise<{ user: User; tenant: Tenant }> {
  const session = await getSession()
  if (!session) redirect('/login')

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  if (!user) redirect('/login')

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, user.tenantId))
    .limit(1)

  if (!tenant) redirect('/login')

  return { user, tenant }
}

export async function getAuthTenant(): Promise<{ user: User; tenant: Tenant } | null> {
  const session = await getSession()
  if (!session) return null

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  if (!user) return null

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, user.tenantId))
    .limit(1)

  if (!tenant) return null

  return { user, tenant }
}

export async function requireRole(allowedRoles: string[]): Promise<{ user: User; tenant: Tenant } | null> {
  const auth = await getAuthTenant();
  if (!auth) return null;
  const userRole = (auth.user as any).role || 'viewer';
  if (!allowedRoles.includes(userRole)) return null;

  // Hardening 2026-05-11: `super_admin` privileges require BOTH a DB
  // `users.role='super_admin'` AND the user's email being in the
  // SUPERADMIN_EMAILS env allowlist. Without this, anyone with DB write
  // access (or a SQL injection past prior P0s) could flip their role and
  // gain cross-tenant god mode. Matches the apps/web/lib/superadmin.ts
  // pattern that already had this defense.
  if (allowedRoles.includes('super_admin') && userRole === 'super_admin') {
    const allowlist = (process.env.SUPERADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
    const email = (auth.user.email ?? '').toLowerCase()
    // If no allowlist configured we treat the env as "deny all super_admin"
    // — fail closed to avoid the 2024-style "deploy with empty env =
    // silently public" footgun.
    if (allowlist.length === 0 || !allowlist.includes(email)) {
      console.warn(`[auth] super_admin attempt by ${email} blocked (not in SUPERADMIN_EMAILS allowlist)`)
      return null
    }
  }
  return auth;
}

/**
 * Stricter super_admin gate that does NOT fall back to role-only. Use
 * this in /api/admin/* endpoints when you want to be explicit that the
 * email allowlist is required, regardless of what's in users.role.
 */
export async function requireSuperadmin(): Promise<{ user: User; tenant: Tenant } | null> {
  return requireRole(['super_admin'])
}
