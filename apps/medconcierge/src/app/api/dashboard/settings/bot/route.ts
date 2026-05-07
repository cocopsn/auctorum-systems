/**
 * Bot personality + FAQs config (Settings → Bot IA).
 *
 *   GET   → returns the current bot_config jsonb.
 *   PATCH → upserts bot_config AND propagates the FAQs into the canonical
 *           `knowledge_base` table so the RAG path can retrieve them at
 *           runtime. This is what makes the FAQ editor *actually work* —
 *           previously the FAQs were saved in `bot_config.faqs` but no
 *           code path ever read that field. Now every save:
 *             1. wipes existing kb rows tagged metadata.source='settings_bot_faq'
 *             2. embeds each FAQ as "Q: ...\nA: ..." with text-embedding-3-small
 *             3. inserts new kb rows so searchKnowledgeBase() in the worker
 *                surfaces them as RAG chunks for relevant questions
 *
 *   The system prompt + tone fields stay in bot_config but the canonical
 *   prompt the worker sends to OpenAI lives at `tenant.config.ai.systemPrompt`
 *   (edited at /ai-settings).
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@quote-engine/db'
import { sql } from 'drizzle-orm'
import { getAuthTenant } from '@/lib/auth'
import { z } from 'zod'
import { validateOrigin } from '@/lib/csrf'

export const dynamic = 'force-dynamic'

const KB_SOURCE = 'settings_bot_faq'
const OPENAI_BASE_URL = 'https://api.openai.com/v1'

const faqSchema = z.object({
  question: z.string().trim().min(1).max(500),
  answer: z.string().trim().min(1).max(4000),
})

const configSchema = z.object({
  config: z
    .object({
      tone: z.string().max(50).optional(),
      bot_name: z.string().max(100).optional(),
      bot_personality: z.string().max(2000).optional(),
      brand_color: z.string().max(20).optional(),
      schedule: z.record(z.string(), z.unknown()).optional(),
      out_of_hours_message: z.string().max(2000).optional(),
      faqs: z.array(faqSchema).max(50).optional(),
    })
    .passthrough(),
})

async function embed(text: string): Promise<number[] | null> {
  const key = process.env.OPENAI_API_KEY
  if (!key) return null
  try {
    const res = await fetch(`${OPENAI_BASE_URL}/embeddings`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: text.slice(0, 8000) }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { data?: Array<{ embedding?: number[] }> }
    return data.data?.[0]?.embedding ?? null
  } catch {
    return null
  }
}

async function syncFaqsToKnowledgeBase(
  tenantId: string,
  faqs: Array<{ question: string; answer: string }>,
): Promise<{ inserted: number; embedFailures: number }> {
  // Wipe previously-synced FAQ rows so deletes/edits in the UI propagate.
  try {
    await db.execute(
      sql`DELETE FROM knowledge_base
          WHERE tenant_id = ${tenantId}::uuid
            AND metadata->>'source' = ${KB_SOURCE}`,
    )
  } catch (err) {
    console.warn(
      '[settings/bot] failed to wipe FAQ kb rows (non-fatal):',
      err instanceof Error ? err.message : err,
    )
  }

  let inserted = 0
  let embedFailures = 0

  for (const faq of faqs) {
    const content = `Q: ${faq.question}\nA: ${faq.answer}`
    const vec = await embed(content)
    if (!vec) {
      embedFailures += 1
      continue
    }
    try {
      const literal = `[${vec.join(',')}]`
      await db.execute(
        sql`INSERT INTO knowledge_base (tenant_id, content, embedding, metadata)
            VALUES (
              ${tenantId}::uuid,
              ${content},
              ${literal}::vector,
              ${JSON.stringify({ source: KB_SOURCE, question: faq.question })}::jsonb
            )`,
      )
      inserted += 1
    } catch (err) {
      console.warn(
        '[settings/bot] FAQ kb insert failed (non-fatal):',
        err instanceof Error ? err.message : err,
      )
    }
  }

  return { inserted, embedFailures }
}

export async function GET() {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const [row] = (await db.execute(
      sql`SELECT bot_config FROM tenants WHERE id = ${auth.tenant.id}::uuid`,
    )) as any[]

    return NextResponse.json({ config: row?.bot_config || {} })
  } catch (err: any) {
    console.error('bot config GET error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 })
  }

  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
    }
    const parsed = configSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }
    const { config } = parsed.data

    await db.execute(
      sql`UPDATE tenants SET bot_config = ${JSON.stringify(config)}::jsonb WHERE id = ${auth.tenant.id}::uuid`,
    )

    // Propagate FAQs to the canonical RAG knowledge_base — the worker
    // queries this via searchKnowledgeBase() to enrich the system prompt
    // with relevant FAQ snippets at runtime.
    let kbStats: { inserted: number; embedFailures: number } | null = null
    if (Array.isArray(config.faqs)) {
      kbStats = await syncFaqsToKnowledgeBase(auth.tenant.id, config.faqs)
    }

    return NextResponse.json({ config, kb: kbStats })
  } catch (err: any) {
    console.error('bot config PATCH error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
