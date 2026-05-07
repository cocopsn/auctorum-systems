/**
 * Bot canned messages — read/write the per-tenant `bot_messages` map that
 * powers WhatsApp confirmations, reminders, and recall messages.
 *
 * Storage: `tenants.config.bot_messages` (jsonb key on the existing config
 * object). Same place apply-template + apply-specialty write to. The
 * legacy top-level `tenants.bot_messages` column is read as fallback so
 * tenants saved before this consolidation don't lose customizations; on
 * the next save, the legacy value is migrated into config and the column
 * is cleared.
 *
 * Messages are CONSUMED by:
 *   - apps/medconcierge/src/app/api/dashboard/appointments/[id]/cancel/route.ts
 *   - apps/medconcierge/src/app/api/dashboard/appointments/[id]/route.ts (reschedule)
 *   - scripts/cron-appointment-reminders.ts
 * via `formatBotMessage(tenant, key, vars)` from `@/lib/bot-messages`.
 */
import { NextRequest, NextResponse } from 'next/server'
import { db, tenants } from '@quote-engine/db'
import { eq } from 'drizzle-orm'
import { getAuthTenant } from '@/lib/auth'
import { z } from 'zod'
import { validateOrigin } from '@/lib/csrf'
import { DEFAULT_BOT_MESSAGES, getBotMessages } from '@/lib/bot-messages'

export const dynamic = 'force-dynamic'

const messagesSchema = z.object({
  messages: z.record(z.string().min(1), z.string().max(2000)),
})

export async function GET() {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const messages = getBotMessages(auth.tenant)
    return NextResponse.json({ messages, defaults: DEFAULT_BOT_MESSAGES })
  } catch (err: any) {
    console.error('bot messages GET error:', err)
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

    const parsed = messagesSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    // Merge into existing config so we don't blow away other config keys.
    // Also fold in the legacy top-level column (one-shot migration on save).
    const currentConfig = (auth.tenant.config ?? {}) as Record<string, unknown>
    const legacyTopLevel = ((auth.tenant as any).botMessages ?? {}) as Record<string, string>
    const existingInConfig =
      (currentConfig.bot_messages as Record<string, string> | undefined) ?? {}

    const nextConfig = {
      ...currentConfig,
      bot_messages: {
        ...legacyTopLevel,
        ...existingInConfig,
        ...parsed.data.messages,
      },
    }

    await db
      .update(tenants)
      .set({
        config: nextConfig as any,
        // Clear the legacy column so getBotMessages stops falling back to it
        botMessages: {} as any,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, auth.tenant.id))

    return NextResponse.json({
      messages: nextConfig.bot_messages,
      defaults: DEFAULT_BOT_MESSAGES,
    })
  } catch (err: any) {
    console.error('bot messages PATCH error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
