import { NextRequest, NextResponse } from 'next/server'
import { db, followUps, clients } from '@quote-engine/db'
import { eq, and, desc, isNull, sql } from 'drizzle-orm'
import { getAuthTenant } from '@/lib/auth'
import { z } from 'zod'
import { sanitizeText } from '@/lib/sanitize'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'

    // Mandatory pagination (FIX 7.2)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '50'))
    const offset = (page - 1) * limit

    // Build where conditions — filter out soft-deleted records (FIX 7.1)
    const conditions = status !== 'all'
      ? and(eq(followUps.tenantId, auth.tenant.id), eq(followUps.status, status), isNull(followUps.deletedAt))
      : and(eq(followUps.tenantId, auth.tenant.id), isNull(followUps.deletedAt))

    const data = await db
      .select({
        id: followUps.id,
        type: followUps.type,
        status: followUps.status,
        scheduledAt: followUps.scheduledAt,
        sentAt: followUps.sentAt,
        messageTemplate: followUps.messageTemplate,
        createdAt: followUps.createdAt,
        clientId: followUps.clientId,
        clientName: clients.name,
        clientPhone: clients.phone,
      })
      .from(followUps)
      .leftJoin(clients, eq(followUps.clientId, clients.id))
      .where(conditions)
      .orderBy(desc(followUps.scheduledAt))
      .limit(limit)
      .offset(offset)

    return NextResponse.json({ followUps: data, pagination: { page, limit, offset } })
  } catch (err: any) {
    console.error('Follow-ups GET error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

const createSchema = z.object({
  clientId: z.string().uuid(),
  type: z.string().max(30).default('custom'),
  scheduledAt: z.string(),
  messageTemplate: z.string().max(1000).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const messageTemplate = parsed.data.messageTemplate
      ? sanitizeText(parsed.data.messageTemplate)
      : null

    const [created] = await db.insert(followUps).values({
      tenantId: auth.tenant.id,
      clientId: parsed.data.clientId,
      type: parsed.data.type,
      scheduledAt: new Date(parsed.data.scheduledAt),
      messageTemplate,
      status: 'scheduled',
    }).returning()

    return NextResponse.json({ followUp: created })
  } catch (err: any) {
    console.error('Follow-ups POST error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
