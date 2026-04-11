import { NextRequest, NextResponse } from 'next/server'
import { db, tenants } from '@quote-engine/db'
import { eq, sql } from 'drizzle-orm'
import { getAuthTenant, requireRole } from '@/lib/auth'
import { z } from 'zod'
import { sanitizeText } from '@/lib/sanitize'

export const dynamic = 'force-dynamic'

const DEFAULT_MESSAGES: Record<string, string> = {
  welcome: 'Hola {nombre}, bienvenido a {negocio}. ¿En qué podemos ayudarte?',
  out_of_catalog: 'Lo sentimos, ese producto no está en nuestro catálogo.',
  out_of_stock: 'Ese producto no está disponible en este momento.',
  order_confirmed: 'Tu pedido ha sido confirmado. Te avisaremos cuando esté listo.',
  appointment_confirmed: 'Tu cita ha sido confirmada para el {fecha} a las {hora}.',
  appointment_reminder: 'Recordatorio: mañana {fecha} tienes cita a las {hora}.',
  recall: 'Hola {nombre}, ha pasado tiempo desde tu última visita. Te invitamos a agendar tu próxima cita.',
}

export async function GET() {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const [row] = await db.execute(
      sql`SELECT bot_messages FROM tenants WHERE id = ${auth.tenant.id}`
    ) as any[]

    const messages = row?.bot_messages || DEFAULT_MESSAGES

    return NextResponse.json({ messages })
  } catch (err: any) {
    console.error('bot messages GET error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

const messagesSchema = z.object({
  welcome: z.string().max(1000).optional(),
  out_of_catalog: z.string().max(1000).optional(),
  out_of_stock: z.string().max(1000).optional(),
  order_confirmed: z.string().max(1000).optional(),
  appointment_confirmed: z.string().max(1000).optional(),
  appointment_reminder: z.string().max(1000).optional(),
  recall: z.string().max(1000).optional(),
}).passthrough()

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireRole(['admin'])
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const { messages } = body

    if (!messages || typeof messages !== 'object') {
      return NextResponse.json({ error: 'messages es requerido' }, { status: 400 })
    }

    const parsed = messagesSchema.safeParse(messages)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos invalidos', details: parsed.error.flatten() }, { status: 400 })
    }

    // Sanitize all string values
    const sanitized: Record<string, unknown> = { ...parsed.data }
    for (const key of Object.keys(sanitized)) {
      if (typeof sanitized[key] === 'string') {
        sanitized[key] = sanitizeText(sanitized[key] as string)
      }
    }

    await db.execute(
      sql`UPDATE tenants SET bot_messages = ${JSON.stringify(sanitized)}::jsonb WHERE id = ${auth.tenant.id}`
    )

    return NextResponse.json({ messages: sanitized })
  } catch (err: any) {
    console.error('bot messages PATCH error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
