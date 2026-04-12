import { NextRequest, NextResponse } from 'next/server'
import { db, clients, quotes } from '@quote-engine/db'
import { eq, and, isNull, desc, sql } from 'drizzle-orm'
import { getAuthTenant } from '@/lib/auth'
import type { TenantConfig } from '@quote-engine/db'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const [client] = await db
      .select()
      .from(clients)
      .where(and(
        eq(clients.id, params.clientId),
        eq(clients.tenantId, auth.tenant.id),
        isNull(clients.deletedAt),
      ))
      .limit(1)

    if (!client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    const relatedQuotes = client.phone
      ? await db
          .select({
            id: quotes.id,
            quoteNumber: quotes.quoteNumber,
            tenantSeq: quotes.tenantSeq,
            status: quotes.status,
            total: quotes.total,
            createdAt: quotes.createdAt,
          })
          .from(quotes)
          .where(and(
            eq(quotes.tenantId, auth.tenant.id),
            sql`regexp_replace(${quotes.clientPhone}, '\D', '', 'g') = ${client.phone}`,
          ))
          .orderBy(desc(quotes.createdAt))
          .limit(50)
      : []

    const config = auth.tenant.config as TenantConfig
    const folioPrefix = config?.quote_settings?.auto_number_prefix?.trim() || 'COT'

    return NextResponse.json({ client, quotes: relatedQuotes, folioPrefix })
  } catch (err: any) {
    console.error('Client detail GET error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
