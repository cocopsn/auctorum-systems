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
