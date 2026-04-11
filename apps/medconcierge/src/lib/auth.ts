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
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}

export async function getSession() {
  const supabase = createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
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

/**
 * Auth helper for API routes — returns null instead of redirecting.
 * Use this in route handlers where redirect() is not appropriate.
 */
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
  return auth;
}