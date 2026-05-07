/**
 * Google Ads Lead Form Extensions webhook.
 *
 * El doctor configura, en su cuenta de Google Ads, un Webhook URL +
 * Authentication Key. Cuando un usuario completa el form, Google POSTea
 * aquí con el JSON estándar de Google Ads (formato documentado:
 * https://support.google.com/google-ads/answer/7720301).
 *
 * Resolución de tenant: por el token enviado en `google_key` (campo del
 * payload) o en el header `X-Webhook-Token` (cuando el doctor lo configuró
 * así en la integración).
 *
 * Lookup: integrations WHERE type='google_ads' AND config->>'webhookToken' = token
 *
 * No hay HMAC — Google solo verifica el token compartido. Por eso es CRÍTICO
 * que el token sea un random largo (recomendamos 32 bytes hex en la UI de
 * settings).
 */
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { and, eq, sql } from 'drizzle-orm'
import {
  db,
  adLeads,
  integrations,
  tenants,
  type Tenant,
  type GoogleAdsConfig,
} from '@quote-engine/db'
import { autoContactLead, formatPhoneMX } from '@/lib/lead-autocontact'

// ─── Tenant resolution ─────────────────────────────────────────────────────

async function findTenantByWebhookToken(
  token: string,
): Promise<{ tenant: Tenant; config: GoogleAdsConfig } | null> {
  if (!token || token.length < 8) return null
  const rows = await db
    .select({
      tenant: tenants,
      config: integrations.config,
    })
    .from(integrations)
    .innerJoin(tenants, eq(tenants.id, integrations.tenantId))
    .where(
      and(
        eq(integrations.type, 'google_ads'),
        sql`${integrations.config}->>'webhookToken' = ${token}`,
      ),
    )
    .limit(1)

  if (rows.length === 0) return null
  return { tenant: rows[0].tenant, config: (rows[0].config ?? {}) as GoogleAdsConfig }
}

// ─── Field extraction (Google's user_column_data shape) ────────────────────

function gValue(columns: any[], ids: string[]): string {
  for (const id of ids) {
    const c = columns.find(
      (x: any) =>
        typeof x?.column_id === 'string' && x.column_id.toUpperCase() === id.toUpperCase(),
    )
    if (c?.string_value) return String(c.string_value)
  }
  return ''
}

// ─── POST handler ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  // Token puede venir en el body (campo `google_key` por convención) o en header
  const token = (body?.google_key as string) || req.headers.get('x-webhook-token') || ''

  const resolved = await findTenantByWebhookToken(token)
  if (!resolved) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  // Google Ads payload shape
  // {
  //   "lead_id": "...", "api_version": "1.0",
  //   "google_key": "...",
  //   "form_id": 12345,
  //   "campaign_id": "...",
  //   "gcl_id": "...",
  //   "user_column_data": [{ "column_id": "FULL_NAME", "string_value": "..."}, ...]
  // }
  const columns = Array.isArray(body?.user_column_data) ? body.user_column_data : []
  const name = gValue(columns, ['FULL_NAME', 'NAME'])
  const phoneRaw = gValue(columns, ['PHONE_NUMBER', 'PHONE'])
  const email = gValue(columns, ['EMAIL'])
  const message = gValue(columns, ['MESSAGE', 'COMMENT'])
  const phone = formatPhoneMX(phoneRaw)

  try {
    const [inserted] = await db
      .insert(adLeads)
      .values({
        tenantId: resolved.tenant.id,
        source: 'google',
        campaignName: body?.campaign_id ? String(body.campaign_id) : null,
        adName: body?.ad_group_id ? String(body.ad_group_id) : null,
        formId: body?.form_id != null ? String(body.form_id) : null,
        name: name || null,
        phone: phone || null,
        email: email || null,
        message: message || null,
        rawData: body,
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: body?.campaign_id ? String(body.campaign_id) : null,
      })
      .returning()

    if (resolved.config.autoContact !== false && inserted.phone) {
      await autoContactLead(resolved.tenant, inserted, {
        customMessage: resolved.config.autoContactMessage,
      })
    }

    return NextResponse.json({ success: true, lead_id: inserted.id })
  } catch (err) {
    console.error('[google-leads] insert failed:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
