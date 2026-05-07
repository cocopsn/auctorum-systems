/**
 * Settings → Instagram DMs (channel for the unified inbox).
 *
 *   GET    → state of the instagram_dm integration row
 *   PUT    → upsert pageId/pageName/accessToken
 *   DELETE → disconnect (removes the integrations row; existing convos stay)
 *
 * Different from /settings/ads (Lead Ads). This is purely about ingesting and
 * sending DMs through the same Page that hosts the IG Business account.
 */
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, integrations, type InstagramDmConfig } from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'
import { validateOrigin } from '@/lib/csrf'

function maskToken(t: string | undefined | null): string | null {
  if (!t) return null
  if (t.length <= 8) return '••••'
  return `${t.slice(0, 4)}••••${t.slice(-4)}`
}

async function loadIg(tenantId: string) {
  const [row] = await db
    .select({
      status: integrations.status,
      config: integrations.config,
      updatedAt: integrations.updatedAt,
    })
    .from(integrations)
    .where(and(eq(integrations.tenantId, tenantId), eq(integrations.type, 'instagram_dm')))
    .limit(1)
  if (!row) return null
  const cfg = (row.config ?? {}) as InstagramDmConfig
  return {
    status: row.status,
    updatedAt: row.updatedAt,
    pageId: cfg.pageId ?? null,
    pageName: cfg.pageName ?? null,
    igAccountId: cfg.igAccountId ?? null,
    accessToken: maskToken(cfg.accessToken),
    connectedAt: cfg.connectedAt ?? null,
  }
}

export async function GET() {
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    return NextResponse.json({ instagram: await loadIg(auth.tenant.id) })
  } catch (err: any) {
    console.error('[settings/instagram GET] error:', err?.message || err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

const putSchema = z.object({
  pageId: z.string().trim().min(1).max(100),
  pageName: z.string().trim().max(255).optional(),
  igAccountId: z.string().trim().max(100).optional(),
  accessToken: z.string().trim().max(500).optional(),
})

export async function PUT(req: NextRequest) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 })
  }
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }
  const parsed = putSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  try {
    const [existing] = await db
      .select({ config: integrations.config })
      .from(integrations)
      .where(
        and(
          eq(integrations.tenantId, auth.tenant.id),
          eq(integrations.type, 'instagram_dm'),
        ),
      )
      .limit(1)
    const prev = (existing?.config ?? {}) as Record<string, unknown>

    const nextConfig: Record<string, unknown> = {
      ...prev,
      pageId: parsed.data.pageId,
      pageName: parsed.data.pageName ?? prev['pageName'],
      igAccountId: parsed.data.igAccountId ?? prev['igAccountId'],
      // Only overwrite token if a non-empty value came in. Empty string =
      // "user didn't change it, keep what's stored".
      accessToken:
        parsed.data.accessToken && parsed.data.accessToken.length > 0
          ? parsed.data.accessToken
          : prev['accessToken'],
      connectedAt: prev['connectedAt'] ?? new Date().toISOString(),
    }

    if (existing) {
      await db
        .update(integrations)
        .set({ status: 'connected', config: nextConfig as any, updatedAt: new Date() })
        .where(
          and(
            eq(integrations.tenantId, auth.tenant.id),
            eq(integrations.type, 'instagram_dm'),
          ),
        )
    } else {
      await db.insert(integrations).values({
        tenantId: auth.tenant.id,
        type: 'instagram_dm',
        status: 'connected',
        config: nextConfig as any,
      })
    }

    return NextResponse.json({ instagram: await loadIg(auth.tenant.id) })
  } catch (err: any) {
    console.error('[settings/instagram PUT] error:', err?.message || err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 })
  }
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await db
      .delete(integrations)
      .where(
        and(
          eq(integrations.tenantId, auth.tenant.id),
          eq(integrations.type, 'instagram_dm'),
        ),
      )
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[settings/instagram DELETE] error:', err?.message || err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
