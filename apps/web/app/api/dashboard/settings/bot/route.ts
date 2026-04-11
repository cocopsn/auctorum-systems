import { NextRequest, NextResponse } from 'next/server'
import { db } from '@quote-engine/db'
import { sql } from 'drizzle-orm'
import { getAuthTenant, requireRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const [row] = await db.execute(
      sql`SELECT bot_config FROM tenants WHERE id = ${auth.tenant.id}`
    ) as any[]

    return NextResponse.json({ config: row?.bot_config || {} })
  } catch (err: any) {
    console.error('bot config GET error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireRole(['admin'])
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const { config } = body

    if (!config || typeof config !== 'object') {
      return NextResponse.json({ error: 'config es requerido' }, { status: 400 })
    }

    await db.execute(
      sql`UPDATE tenants SET bot_config = ${JSON.stringify(config)}::jsonb WHERE id = ${auth.tenant.id}`
    )

    return NextResponse.json({ config })
  } catch (err: any) {
    console.error('bot config PATCH error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}