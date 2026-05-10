import { NextRequest, NextResponse } from 'next/server'
import { db, followUps, clients } from '@quote-engine/db'
import { eq, and, desc } from 'drizzle-orm'
import { getAuthTenant } from '@/lib/auth'
import { z } from 'zod'
import { validateOrigin } from '@/lib/csrf'
import { validateClientBelongsToTenant, CrossTenantError } from '@/lib/tenant-validation'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'

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
      .where(
        status !== 'all'
          ? and(eq(followUps.tenantId, auth.tenant.id), eq(followUps.status, status))
          : eq(followUps.tenantId, auth.tenant.id)
      )
      .orderBy(desc(followUps.scheduledAt))

    return NextResponse.json({ followUps: data })
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
  if (!validateOrigin(request)) return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });

  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    // Cross-tenant FK guard — see lib/tenant-validation.ts.
    try {
      await validateClientBelongsToTenant(parsed.data.clientId, auth.tenant.id)
    } catch (err) {
      if (err instanceof CrossTenantError) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
      throw err
    }

    const [created] = await db.insert(followUps).values({
      tenantId: auth.tenant.id,
      clientId: parsed.data.clientId,
      type: parsed.data.type,
      scheduledAt: new Date(parsed.data.scheduledAt),
      messageTemplate: parsed.data.messageTemplate || null,
      status: 'scheduled',
    }).returning()

    return NextResponse.json({ followUp: created })
  } catch (err: any) {
    console.error('Follow-ups POST error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
