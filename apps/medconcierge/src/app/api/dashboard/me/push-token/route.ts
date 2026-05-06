export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db, users } from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'

const bodySchema = z.object({
  expoPushToken: z
    .string()
    .min(1)
    .max(255)
    .regex(
      /^ExponentPushToken\[[A-Za-z0-9_-]+\]$|^ExpoPushToken\[[A-Za-z0-9_-]+\]$/,
      'Invalid Expo push token format',
    ),
  platform: z.enum(['ios', 'android']),
})

/**
 * POST /api/dashboard/me/push-token
 *
 * Mobile app calls this once after login (and again whenever the OS rotates
 * the push token) to associate the device with the user.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    await db
      .update(users)
      .set({
        expoPushToken: parsed.data.expoPushToken,
        pushPlatform: parsed.data.platform,
        pushTokenUpdatedAt: new Date(),
      })
      .where(eq(users.id, auth.user.id))

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/dashboard/me/push-token] error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/dashboard/me/push-token — clear on logout / app uninstall.
 */
export async function DELETE() {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await db
      .update(users)
      .set({ expoPushToken: null, pushPlatform: null, pushTokenUpdatedAt: new Date() })
      .where(eq(users.id, auth.user.id))

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/dashboard/me/push-token] error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
