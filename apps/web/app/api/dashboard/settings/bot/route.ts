import { NextRequest, NextResponse } from 'next/server'
import { db } from '@quote-engine/db'
import { sql } from 'drizzle-orm'
import { getAuthTenant, requireRole } from '@/lib/auth'
import { z } from 'zod'
import { sanitizeText } from '@/lib/sanitize'

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

const botConfigSchema = z.object({
  enabled: z.boolean().optional(),
  greeting: z.string().max(500).optional(),
  fallbackMessage: z.string().max(500).optional(),
  responseDelay: z.number().min(0).max(30).optional(),
  faqs: z.array(z.object({
    question: z.string().max(500),
    answer: z.string().max(2000),
  })).max(50).optional(),
}).passthrough()

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireRole(['admin'])
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const { config } = body

    if (!config || typeof config !== 'object') {
      return NextResponse.json({ error: 'config es requerido' }, { status: 400 })
    }

    const parsed = botConfigSchema.safeParse(config)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos invalidos', details: parsed.error.flatten() }, { status: 400 })
    }

    // Sanitize text fields
    const sanitized = { ...parsed.data }
    if (sanitized.greeting) sanitized.greeting = sanitizeText(sanitized.greeting)
    if (sanitized.fallbackMessage) sanitized.fallbackMessage = sanitizeText(sanitized.fallbackMessage)
    if (sanitized.faqs) {
      sanitized.faqs = sanitized.faqs.map(faq => ({
        question: sanitizeText(faq.question),
        answer: sanitizeText(faq.answer),
      }))
    }

    await db.execute(
      sql`UPDATE tenants SET bot_config = ${JSON.stringify(sanitized)}::jsonb WHERE id = ${auth.tenant.id}`
    )

    return NextResponse.json({ config: sanitized })
  } catch (err: any) {
    console.error('bot config PATCH error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
