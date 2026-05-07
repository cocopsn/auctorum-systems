/**
 * In-product help assistant. Floating chat in the dashboard. Answers
 * questions about *the platform* (how to connect Google Calendar, where to
 * edit the bot prompt, etc.) — NOT medical questions.
 *
 * Uses gpt-4o-mini directly via REST (same pattern as packages/ai/index.ts —
 * no extra SDK dep). Auth-gated, CSRF-validated, rate-limited per tenant
 * to keep accidental loops cheap.
 */
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthTenant } from '@/lib/auth'
import { validateOrigin } from '@/lib/csrf'
import { rateLimit } from '@/lib/rate-limit'
import { HELP_SYSTEM_PROMPT } from '@/lib/help-bot-prompt'

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(4000),
})

const bodySchema = z.object({
  message: z.string().trim().min(1).max(2000),
  history: z.array(messageSchema).max(12).optional(),
})

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'

export async function POST(req: NextRequest) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 })
  }

  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 30 messages per tenant per 5 min — very generous, just protects against
  // runaway loops on the client.
  const rl = await rateLimit(`help-bot:${auth.tenant.id}`, 30, 5 * 60_000)
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Demasiadas preguntas seguidas. Intenta de nuevo en un momento.' },
      { status: 429 },
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const { message, history = [] } = parsed.data

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { reply: 'El asistente está en mantenimiento. Escribe a contacto@auctorum.com.mx.' },
      { status: 200 },
    )
  }

  try {
    const messages = [
      { role: 'system', content: HELP_SYSTEM_PROMPT },
      ...history.slice(-6),
      { role: 'user', content: message },
    ]

    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 350,
        temperature: 0.3,
      }),
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.warn('[help-bot] OpenAI', res.status, detail.slice(0, 200))
      return NextResponse.json(
        {
          reply:
            'No pude procesar tu pregunta en este momento. Vuelve a intentar o escribe a contacto@auctorum.com.mx.',
        },
        { status: 200 },
      )
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const reply =
      data.choices?.[0]?.message?.content?.trim() ||
      'No tengo una respuesta para eso. Escribe a contacto@auctorum.com.mx.'

    return NextResponse.json({ reply })
  } catch (err) {
    console.error('[help-bot] error:', err instanceof Error ? err.message : err)
    return NextResponse.json(
      {
        reply:
          'El asistente está temporalmente fuera de servicio. Escribe a contacto@auctorum.com.mx.',
      },
      { status: 200 },
    )
  }
}
