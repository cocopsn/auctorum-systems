import { NextResponse } from 'next/server'
import { db, clients } from '@quote-engine/db'
import { eq, desc } from 'drizzle-orm'
import { getAuthTenant } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenantClients = await db
      .select()
      .from(clients)
      .where(eq(clients.tenantId, auth.tenant.id))
      .orderBy(desc(clients.lastQuoteAt))

    return NextResponse.json({ clients: tenantClients })
  } catch (err: any) {
    console.error('Clients GET error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
