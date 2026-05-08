import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db, users, tenants } from '@quote-engine/db'
import type { User, Tenant } from '@quote-engine/db'
import { createSupabaseServer } from './supabase-ssr'

/**
 * Returns a session-like object validated against Supabase Auth (NOT
 * trusted from cookie alone).
 *
 *   - `auth.getSession()` reads the cookie and parses it locally — fast
 *     but trusts the contents. A leaked / forged token is accepted.
 *   - `auth.getUser()` calls Supabase's `/auth/v1/user` over HTTPS with
 *     the access_token, so the server-side cryptographic check happens.
 *
 * The medconcierge app already uses getUser() (see apps/medconcierge/src/
 * lib/auth.ts). The web app was the last consumer of the unsafe path.
 */
export async function getSession() {
  const supabase = createSupabaseServer()
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    // Mimic the prior session shape so call sites stay unchanged.
    return { user } as unknown as { user: { id: string; email: string | null } }
  } catch {
    return null
  }
}

export async function requireAuth(): Promise<{ user: User; tenant: Tenant }> {
  const session = await getSession()
  if (!session) redirect('/login')

  let [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  // Auto-sync: if auth ID changed (e.g. re-registration), match by email and update
  if (!user && session.user.email) {
    const [byEmail] = await db
      .select()
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1)

    if (byEmail) {
      await db
        .update(users)
        .set({ id: session.user.id })
        .where(eq(users.id, byEmail.id))
      user = { ...byEmail, id: session.user.id }
      console.log(`[auth] Auto-synced user ID for ${session.user.email}: ${byEmail.id} -> ${session.user.id}`)
    }
  }

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

  let [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  // Auto-sync: if auth ID changed (e.g. re-registration), match by email and update
  if (!user && session.user.email) {
    const [byEmail] = await db
      .select()
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1)

    if (byEmail) {
      await db
        .update(users)
        .set({ id: session.user.id })
        .where(eq(users.id, byEmail.id))
      user = { ...byEmail, id: session.user.id }
      console.log(`[auth] Auto-synced user ID for ${session.user.email}: ${byEmail.id} -> ${session.user.id}`)
    }
  }

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
  return auth;
}