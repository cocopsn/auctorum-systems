/**
 * Facebook / Instagram Lead Ads webhook.
 *
 * Meta dispara este webhook cuando alguien completa un Lead Form. El payload
 * incluye un `leadgen_id` que tenemos que ir a buscar a la Graph API para
 * obtener los `field_data` (nombre, teléfono, email).
 *
 * Resolución de tenant: por `page_id` contra
 *   integrations WHERE type='meta_ads' AND config->>'pageId' = page_id
 *
 * Verificación: HMAC SHA-256 con `META_APP_SECRET` (env compartido a nivel
 * Meta App; cada tenant individual NO firma sus propios webhooks de leads —
 * comparten la misma app de Meta y por tanto el mismo app_secret).
 *
 * GET handler: responde el verify challenge cuando suscribes el webhook
 * en la Meta App Dashboard.
 */
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { and, eq, sql } from 'drizzle-orm'
import {
  db,
  adLeads,
  integrations,
  tenants,
  type Tenant,
  type MetaAdsConfig,
} from '@quote-engine/db'
import { autoContactLead, formatPhoneMX } from '@/lib/lead-autocontact'

// ─── HMAC verification ─────────────────────────────────────────────────────

function verifyMetaSignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET
  if (!appSecret) {
    console.warn('[meta-leads] META_APP_SECRET not configured')
    return false
  }
  if (!signatureHeader) return false

  const expected =
    'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader))
  } catch {
    return false
  }
}

// ─── Tenant resolution ─────────────────────────────────────────────────────

async function findTenantByPageId(
  pageId: string,
): Promise<{ tenant: Tenant; config: MetaAdsConfig } | null> {
  const rows = await db
    .select({
      tenant: tenants,
      config: integrations.config,
    })
    .from(integrations)
    .innerJoin(tenants, eq(tenants.id, integrations.tenantId))
    .where(
      and(
        eq(integrations.type, 'meta_ads'),
        sql`${integrations.config}->>'pageId' = ${pageId}`,
      ),
    )
    .limit(1)

  if (rows.length === 0) return null
  return { tenant: rows[0].tenant, config: (rows[0].config ?? {}) as MetaAdsConfig }
}

// ─── Lead fetch from Meta Graph API ────────────────────────────────────────

async function fetchLeadFromMeta(
  leadgenId: string,
  accessToken: string | undefined,
): Promise<any | null> {
  if (!accessToken) return null
  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${leadgenId}?access_token=${encodeURIComponent(
        accessToken,
      )}`,
      { method: 'GET' },
    )
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      console.warn(`[meta-leads] graph fetch failed (${res.status}):`, txt.slice(0, 200))
      return null
    }
    return await res.json()
  } catch (err) {
    console.warn('[meta-leads] graph fetch error:', err instanceof Error ? err.message : err)
    return null
  }
}

function fieldValue(fields: any[], names: string[]): string {
  for (const name of names) {
    const f = fields.find(
      (x: any) => typeof x?.name === 'string' && x.name.toLowerCase() === name.toLowerCase(),
    )
    if (f?.values?.[0]) return String(f.values[0])
  }
  return ''
}

// ─── GET — Meta verify challenge ───────────────────────────────────────────

export async function GET(req: NextRequest) {
  const verifyToken = process.env.META_LEADS_VERIFY_TOKEN
  if (!verifyToken) {
    return new NextResponse('Not configured', { status: 503 })
  }

  const url = new URL(req.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === verifyToken) {
    return new NextResponse(challenge ?? '', { status: 200 })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

// ─── POST — leadgen events ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let rawBody: string
  try {
    rawBody = await req.text()
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  const signature = req.headers.get('x-hub-signature-256')
  if (!verifyMetaSignature(rawBody, signature)) {
    console.warn('[meta-leads] invalid HMAC signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
  }

  let body: any
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  if (body?.object !== 'page') {
    // No es leadgen — Meta a veces dispara otros objetos en la misma URL si
    // tienes varios webhooks; ignoramos en silencio para no romper la entrega.
    return NextResponse.json({ success: true, ignored: true })
  }

  const summary = { received: 0, persisted: 0, autoContacted: 0, errors: 0 }

  for (const entry of (body.entry ?? []) as any[]) {
    for (const change of (entry.changes ?? []) as any[]) {
      if (change.field !== 'leadgen') continue
      summary.received += 1

      const value = change.value ?? {}
      const leadgenId: string | undefined = value.leadgen_id
      const formId: string | undefined = value.form_id
      const pageId: string | undefined = value.page_id
      const adId: string | undefined = value.ad_id
      const campaignId: string | undefined = value.campaign_id

      if (!leadgenId || !pageId) {
        summary.errors += 1
        console.warn('[meta-leads] missing leadgen_id or page_id', value)
        continue
      }

      const resolved = await findTenantByPageId(pageId)
      if (!resolved) {
        summary.errors += 1
        console.warn(`[meta-leads] no tenant for page ${pageId}`)
        continue
      }

      const leadData = await fetchLeadFromMeta(leadgenId, resolved.config.accessToken)
      const fields = (leadData?.field_data ?? []) as any[]
      const name = fieldValue(fields, ['full_name', 'first_name', 'name'])
      const phoneRaw = fieldValue(fields, ['phone_number', 'phone'])
      const email = fieldValue(fields, ['email'])
      const message = fieldValue(fields, ['message', 'comments', 'mensaje'])

      const phone = formatPhoneMX(phoneRaw)

      // Determine source: instagram vs facebook based on platform field
      const platform = String(value.platform ?? leadData?.platform ?? '').toLowerCase()
      const source = platform.includes('instagram') ? 'instagram' : 'facebook'

      try {
        const [inserted] = await db
          .insert(adLeads)
          .values({
            tenantId: resolved.tenant.id,
            source,
            campaignName: campaignId ?? null,
            adName: adId ?? null,
            formId: formId ?? null,
            name: name || null,
            phone: phone || null,
            email: email || null,
            message: message || null,
            rawData: { webhook: value, fetched: leadData ?? null },
            utmSource: source,
            utmMedium: 'paid_social',
            utmCampaign: campaignId ?? null,
          })
          .returning()
        summary.persisted += 1

        // Auto-contact si el tenant lo tiene activado y el lead trae teléfono
        if (resolved.config.autoContact !== false && inserted.phone) {
          const contactRes = await autoContactLead(resolved.tenant, inserted, {
            customMessage: resolved.config.autoContactMessage,
          })
          if (contactRes.ok) summary.autoContacted += 1
        }
      } catch (err) {
        summary.errors += 1
        console.error(
          '[meta-leads] insert/contact failed:',
          err instanceof Error ? err.message : err,
        )
      }
    }
  }

  return NextResponse.json({ success: true, ...summary })
}
