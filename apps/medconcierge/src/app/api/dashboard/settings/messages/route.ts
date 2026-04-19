import { NextRequest, NextResponse } from 'next/server'
import { db, tenants } from '@quote-engine/db'
import { eq, sql } from 'drizzle-orm'
import { getAuthTenant } from '@/lib/auth'
import { z } from 'zod';
import { validateOrigin } from '@/lib/csrf'

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

export async function PATCH(request: NextRequest) {
  if (!validateOrigin(request)) return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });

  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const { messages } = body

    if (!messages || typeof messages !== 'object') {
      return NextResponse.json({ error: 'messages es requerido' }, { status: 400 })
    }

    await db.execute(
      sql`UPDATE tenants SET bot_messages = ${JSON.stringify(messages)}::jsonb WHERE id = ${auth.tenant.id}`
    )

    return NextResponse.json({ messages })
  } catch (err: any) {
    console.error('bot messages PATCH error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
