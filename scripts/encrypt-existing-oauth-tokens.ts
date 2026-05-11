/**
 * One-shot migration: encrypt plaintext OAuth + integration tokens that
 * live in JSONB columns (`tenants.config.googleCalendar.oauth`,
 * `integrations.config`).
 *
 * Pre-2026-05-12 these were stored plaintext, which under combined
 * P0-1 (RLS bypass) and P1-4 (anon role read) could be dumped via the
 * Supabase REST API. The Google OAuth callback now encrypts at write
 * time; this script back-fills existing rows.
 *
 * Idempotent: rows already marked `encrypted:true` are skipped.
 *
 * Run:
 *   set -a && . apps/medconcierge/.env.local && set +a && \
 *     npx tsx scripts/encrypt-existing-oauth-tokens.ts
 */

import 'dotenv/config'
import { db, tenants, integrations, encrypt } from '@quote-engine/db'
import { eq, sql } from 'drizzle-orm'

type GoogleOAuthBlob = {
  accessToken?: string | null
  refreshToken?: string | null
  encrypted?: boolean
  [k: string]: unknown
}

function looksEncrypted(value: string | null | undefined): boolean {
  if (!value) return true // nothing to encrypt
  // Our ciphertext shape is `iv(32hex):tag(32hex):cipher`. A plaintext
  // Google access_token is base64url-ish and doesn't have colons.
  return /^[0-9a-f]{32}:[0-9a-f]{32}:[0-9a-f]+$/i.test(value)
}

function maybeEncrypt(value: string | null | undefined): string | null {
  if (!value) return null
  if (looksEncrypted(value)) return value
  return encrypt(value)
}

async function encryptTenantGoogleOAuth(): Promise<{ touched: number; skipped: number }> {
  const rows = await db.select({ id: tenants.id, config: tenants.config }).from(tenants)
  let touched = 0
  let skipped = 0
  for (const row of rows) {
    const cfg = (row.config ?? {}) as Record<string, any>
    const gcal = cfg.googleCalendar
    const oauth = gcal?.oauth as GoogleOAuthBlob | undefined
    if (!oauth?.refreshToken && !oauth?.accessToken) { skipped++; continue }
    if (oauth.encrypted) { skipped++; continue }

    const encAccess = maybeEncrypt(oauth.accessToken)
    const encRefresh = maybeEncrypt(oauth.refreshToken)
    const nextConfig = {
      ...cfg,
      googleCalendar: {
        ...gcal,
        oauth: {
          ...oauth,
          accessToken: encAccess,
          refreshToken: encRefresh,
          encrypted: true,
        },
      },
    }
    await db
      .update(tenants)
      .set({ config: nextConfig, updatedAt: new Date() })
      .where(eq(tenants.id, row.id))
    touched++
  }
  return { touched, skipped }
}

async function encryptIntegrationSecrets(): Promise<{ touched: number; skipped: number }> {
  // integrations.config is generic JSONB. We encrypt common secret keys
  // when found at the top level.
  const SECRET_KEYS = ['access_token', 'page_access_token', 'app_secret', 'webhook_secret', 'private_key']
  const rows = await db.select().from(integrations)
  let touched = 0
  let skipped = 0
  for (const row of rows) {
    const cfg = (row.config ?? {}) as Record<string, any>
    if (cfg.encrypted === true) { skipped++; continue }
    let mutated = false
    const next: Record<string, any> = { ...cfg }
    for (const k of SECRET_KEYS) {
      const v = next[k]
      if (typeof v === 'string' && v.length > 8 && !looksEncrypted(v)) {
        next[k] = encrypt(v)
        mutated = true
      }
    }
    if (!mutated) { skipped++; continue }
    next.encrypted = true
    await db
      .update(integrations)
      .set({ config: next, updatedAt: new Date() })
      .where(eq(integrations.id, row.id))
    touched++
  }
  return { touched, skipped }
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set')
  if (!process.env.ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY not set')

  console.log('[encrypt-tokens] starting…')
  const gcal = await encryptTenantGoogleOAuth()
  console.log(`[encrypt-tokens] tenants.googleCalendar.oauth: touched=${gcal.touched} skipped=${gcal.skipped}`)
  const integ = await encryptIntegrationSecrets()
  console.log(`[encrypt-tokens] integrations.config:           touched=${integ.touched} skipped=${integ.skipped}`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[encrypt-tokens] fatal:', err)
    process.exit(1)
  })
