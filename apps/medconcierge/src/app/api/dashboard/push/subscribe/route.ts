/**
 * Persist a Web Push subscription so the worker can fan out push messages
 * later. Idempotent on the endpoint URL — re-subscribing from the same
 * browser updates `last_seen_at` instead of creating a duplicate row.
 *
 * Body (PushSubscription.toJSON()):
 *   {
 *     "endpoint": "https://fcm.googleapis.com/...",
 *     "expirationTime": null,
 *     "keys": { "p256dh": "...", "auth": "..." }
 *   }
 */
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { eq, sql } from 'drizzle-orm'
import { db, webPushSubscriptions } from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'
import { validateOrigin } from '@/lib/csrf'
import { z } from 'zod'

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2048),
  expirationTime: z.union([z.number(), z.null()]).optional(),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(512),
  }),
})

export async function POST(req: NextRequest) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 })
  }

  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json().catch(() => null)
    const parsed = subscriptionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Subscription inválida' }, { status: 400 })
    }

    const { endpoint, keys } = parsed.data
    const userAgent = req.headers.get('user-agent')?.slice(0, 512) ?? null

    await db
      .insert(webPushSubscriptions)
      .values({
        tenantId: auth.tenant.id,
        userId: auth.user.id,
        endpoint,
        p256dh: keys.p256dh,
        authKey: keys.auth,
        userAgent: userAgent || undefined,
      })
      .onConflictDoUpdate({
        target: webPushSubscriptions.endpoint,
        set: {
          tenantId: auth.tenant.id,
          userId: auth.user.id,
          p256dh: keys.p256dh,
          authKey: keys.auth,
          userAgent: userAgent || undefined,
          lastSeenAt: sql`now()`,
        },
      })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Push subscribe error:', err?.message || err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 })
  }

  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json().catch(() => null)
    if (!body?.endpoint || typeof body.endpoint !== 'string') {
      return NextResponse.json({ error: 'endpoint requerido' }, { status: 400 })
    }

    await db
      .delete(webPushSubscriptions)
      .where(eq(webPushSubscriptions.endpoint, body.endpoint))

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Push unsubscribe error:', err?.message || err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
