/**
 * Public API authentication.
 *
 * Issued keys look like `ak_live_<64 hex chars>`. We never store them in
 * plaintext — only the SHA-256 hash plus a short prefix for UI identification.
 *
 * Usage in route handlers:
 *
 *   const auth = await authenticateApiKey(request)
 *   if (!auth) return unauthorized()
 *   if (!auth.permissions.includes('write')) return forbidden()
 *   // auth.tenant.id is the active tenant
 */

import { createHash, randomBytes } from 'crypto'
import { and, eq } from 'drizzle-orm'
import { db, apiKeys, tenants, type ApiKey, type Tenant, type ApiPermission } from '@quote-engine/db'
import { NextResponse, type NextRequest } from 'next/server'

const KEY_PREFIX = 'ak_live_'

/** Generate a fresh API key. The plaintext is returned ONCE — store the hash only. */
export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const raw = randomBytes(32).toString('hex') // 64 hex chars
  const key = `${KEY_PREFIX}${raw}`
  const hash = createHash('sha256').update(key).digest('hex')
  // 8 chars of the random body is enough to disambiguate without leaking the secret
  const prefix = `${KEY_PREFIX}${raw.substring(0, 8)}`
  return { key, hash, prefix }
}

/** Hash an existing key (e.g. provided in a request) for lookup. */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

export type ApiAuthContext = {
  apiKey: ApiKey
  tenant: Tenant
  permissions: ApiPermission[]
}

/**
 * Look up the API key from the Authorization header and return tenant +
 * permissions. Returns null if invalid, revoked, expired, or missing.
 */
export async function authenticateApiKey(request: Request | NextRequest): Promise<ApiAuthContext | null> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader) return null
  const match = authHeader.match(/^Bearer\s+(ak_live_[a-f0-9]{64})$/)
  if (!match) return null
  const key = match[1]
  const keyHash = hashApiKey(key)

  const [apiKey] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.isActive, true)))
    .limit(1)

  if (!apiKey) return null
  if (apiKey.revokedAt) return null
  if (apiKey.expiresAt && new Date(apiKey.expiresAt).getTime() < Date.now()) return null

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, apiKey.tenantId))
    .limit(1)
  if (!tenant) return null

  // Update last_used_at fire-and-forget — don't block the request
  void db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, apiKey.id))
    .catch(() => {})

  const permissions = Array.isArray(apiKey.permissions)
    ? (apiKey.permissions as ApiPermission[])
    : (['read'] as ApiPermission[])

  return { apiKey, tenant, permissions }
}

/** 401 helper for missing / invalid API key. */
export function apiUnauthorized() {
  return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })
}

/** 403 helper for valid key without the requested permission. */
export function apiForbidden(needed: ApiPermission) {
  return NextResponse.json(
    { error: `Insufficient permissions; '${needed}' required` },
    { status: 403 },
  )
}

/**
 * Per-tenant rate limit gate for the v1 API. Call this AFTER authenticateApiKey
 * succeeds and BEFORE doing the expensive work. Returns either a 429 response
 * (caller should `return` it directly) or null when the request is within budget.
 *
 * Wired through the same usage tracker that meters WhatsApp, so plan caps and
 * add-on packs apply consistently across the surface.
 */
export async function apiRateLimit(tenantId: string, plan: string | null | undefined) {
  const { checkAndTrackUsage } = await import('@quote-engine/ai')
  const usage = await checkAndTrackUsage(tenantId, plan, 'api_calls', 1)
  if (usage.allowed) return null
  return NextResponse.json(
    {
      error: 'Rate limit exceeded',
      limit: usage.totalLimit,
      current: usage.current,
      remaining: 0,
      upgrade_url: 'https://portal.auctorum.com.mx/settings/subscription',
    },
    {
      status: 429,
      headers: {
        'Retry-After': '3600',
        'X-RateLimit-Limit': String(usage.totalLimit),
        'X-RateLimit-Remaining': '0',
      },
    },
  )
}
