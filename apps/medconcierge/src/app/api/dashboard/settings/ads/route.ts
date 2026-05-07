/**
 * Settings → Publicidad — config de Facebook/Instagram + Google Lead Ads.
 *
 *   GET   → estado de las dos integraciones
 *   PUT   → upsert de meta_ads o google_ads en `integrations`
 *   POST  → genera un nuevo webhook token aleatorio (rotación)
 *   DELETE → desconecta (borra la fila de `integrations`)
 *
 * Solo expone shapes públicos (oculta el accessToken de Meta cuando lee — el
 * doctor lo ve enmascarado en el UI).
 */
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { and, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import crypto from 'crypto'
import { db, integrations, type MetaAdsConfig, type GoogleAdsConfig } from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'
import { validateOrigin } from '@/lib/csrf'

type AdsKind = 'meta_ads' | 'google_ads'

function maskToken(t: string | undefined | null): string | null {
  if (!t) return null
  if (t.length <= 8) return '••••'
  return `${t.slice(0, 4)}••••${t.slice(-4)}`
}

async function loadAds(tenantId: string) {
  const rows = await db
    .select({ type: integrations.type, status: integrations.status, config: integrations.config, updatedAt: integrations.updatedAt })
    .from(integrations)
    .where(
      and(
        eq(integrations.tenantId, tenantId),
        sql`${integrations.type} IN ('meta_ads', 'google_ads')`,
      ),
    )

  const meta = rows.find((r) => r.type === 'meta_ads')
  const google = rows.find((r) => r.type === 'google_ads')

  const metaCfg = (meta?.config ?? {}) as MetaAdsConfig
  const googleCfg = (google?.config ?? {}) as GoogleAdsConfig

  return {
    meta: meta
      ? {
          status: meta.status,
          updatedAt: meta.updatedAt,
          pageId: metaCfg.pageId ?? null,
          pageName: metaCfg.pageName ?? null,
          accessToken: maskToken(metaCfg.accessToken),
          formIds: metaCfg.formIds ?? [],
          autoContact: metaCfg.autoContact !== false,
          autoContactMessage: metaCfg.autoContactMessage ?? '',
          autoContactDelaySec: metaCfg.autoContactDelaySec ?? 0,
          connectedAt: metaCfg.connectedAt ?? null,
        }
      : null,
    google: google
      ? {
          status: google.status,
          updatedAt: google.updatedAt,
          webhookToken: maskToken(googleCfg.webhookToken),
          customerId: googleCfg.customerId ?? null,
          autoContact: googleCfg.autoContact !== false,
          autoContactMessage: googleCfg.autoContactMessage ?? '',
          autoContactDelaySec: googleCfg.autoContactDelaySec ?? 0,
          connectedAt: googleCfg.connectedAt ?? null,
        }
      : null,
  }
}

export async function GET() {
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const ads = await loadAds(auth.tenant.id)
    return NextResponse.json(ads)
  } catch (err: any) {
    console.error('[settings/ads GET] error:', err?.message || err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

const metaSchema = z.object({
  kind: z.literal('meta_ads'),
  pageId: z.string().trim().max(100),
  pageName: z.string().trim().max(255).optional(),
  accessToken: z.string().trim().max(500).optional(),
  formIds: z.array(z.string().trim().max(100)).max(50).optional(),
  autoContact: z.boolean().optional(),
  autoContactMessage: z.string().trim().max(2000).optional(),
})

const googleSchema = z.object({
  kind: z.literal('google_ads'),
  customerId: z.string().trim().max(100).optional(),
  autoContact: z.boolean().optional(),
  autoContactMessage: z.string().trim().max(2000).optional(),
})

export async function PUT(req: NextRequest) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 })
  }
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const parsed = z.union([metaSchema, googleSchema]).safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const tenantId = auth.tenant.id
  const kind: AdsKind = parsed.data.kind

  try {
    // Read existing config so we don't overwrite the accessToken/webhookToken
    // when the user only edits the auto-contact message
    const [existing] = await db
      .select({ config: integrations.config })
      .from(integrations)
      .where(and(eq(integrations.tenantId, tenantId), eq(integrations.type, kind)))
      .limit(1)
    const existingCfg = (existing?.config ?? {}) as Record<string, unknown>

    let nextConfig: Record<string, unknown>
    if (parsed.data.kind === 'meta_ads') {
      nextConfig = {
        ...existingCfg,
        pageId: parsed.data.pageId,
        pageName: parsed.data.pageName ?? existingCfg['pageName'],
        // accessToken solo se sobreescribe si vino en el body
        accessToken:
          parsed.data.accessToken && parsed.data.accessToken.length > 0
            ? parsed.data.accessToken
            : existingCfg['accessToken'],
        formIds: parsed.data.formIds ?? existingCfg['formIds'] ?? [],
        autoContact: parsed.data.autoContact ?? existingCfg['autoContact'] ?? true,
        autoContactMessage: parsed.data.autoContactMessage ?? existingCfg['autoContactMessage'] ?? '',
        connectedAt: existingCfg['connectedAt'] ?? new Date().toISOString(),
      }
    } else {
      nextConfig = {
        ...existingCfg,
        customerId: parsed.data.customerId ?? existingCfg['customerId'],
        autoContact: parsed.data.autoContact ?? existingCfg['autoContact'] ?? true,
        autoContactMessage: parsed.data.autoContactMessage ?? existingCfg['autoContactMessage'] ?? '',
        // Generate webhookToken on first save if missing
        webhookToken: existingCfg['webhookToken'] ?? crypto.randomBytes(24).toString('hex'),
        connectedAt: existingCfg['connectedAt'] ?? new Date().toISOString(),
      }
    }

    if (existing) {
      await db
        .update(integrations)
        .set({
          status: 'connected',
          config: nextConfig as any,
          updatedAt: new Date(),
        })
        .where(and(eq(integrations.tenantId, tenantId), eq(integrations.type, kind)))
    } else {
      await db.insert(integrations).values({
        tenantId,
        type: kind,
        status: 'connected',
        config: nextConfig as any,
      })
    }

    const ads = await loadAds(tenantId)
    return NextResponse.json(ads)
  } catch (err: any) {
    console.error('[settings/ads PUT] error:', err?.message || err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

const rotateSchema = z.object({ kind: z.enum(['meta_ads', 'google_ads']) })

export async function POST(req: NextRequest) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 })
  }
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }
  const parsed = rotateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }
  if (parsed.data.kind !== 'google_ads') {
    return NextResponse.json({ error: 'rotation only supported for google_ads' }, { status: 400 })
  }

  const tenantId = auth.tenant.id
  const newToken = crypto.randomBytes(24).toString('hex')

  try {
    const [existing] = await db
      .select({ config: integrations.config })
      .from(integrations)
      .where(and(eq(integrations.tenantId, tenantId), eq(integrations.type, 'google_ads')))
      .limit(1)
    const cfg = (existing?.config ?? {}) as Record<string, unknown>

    const nextConfig = { ...cfg, webhookToken: newToken, connectedAt: new Date().toISOString() }

    if (existing) {
      await db
        .update(integrations)
        .set({ config: nextConfig as any, status: 'connected', updatedAt: new Date() })
        .where(and(eq(integrations.tenantId, tenantId), eq(integrations.type, 'google_ads')))
    } else {
      await db
        .insert(integrations)
        .values({ tenantId, type: 'google_ads', status: 'connected', config: nextConfig as any })
    }

    return NextResponse.json({ webhookToken: newToken })
  } catch (err: any) {
    console.error('[settings/ads POST rotate] error:', err?.message || err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

const deleteSchema = z.object({ kind: z.enum(['meta_ads', 'google_ads']) })

export async function DELETE(req: NextRequest) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 })
  }
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const kind = sp.get('kind')
  const parsed = deleteSchema.safeParse({ kind })
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  try {
    await db
      .delete(integrations)
      .where(and(eq(integrations.tenantId, auth.tenant.id), eq(integrations.type, parsed.data.kind)))
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[settings/ads DELETE] error:', err?.message || err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
