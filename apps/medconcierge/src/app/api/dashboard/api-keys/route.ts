export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { and, desc, eq } from 'drizzle-orm'
import { db, apiKeys } from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'
import { generateApiKey } from '@/lib/api-auth'
import { validateOrigin } from '@/lib/csrf'

// ---------------------------------------------------------------------------
// GET /api/dashboard/api-keys — list (NEVER return key plaintext)
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rows = await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        permissions: apiKeys.permissions,
        rateLimit: apiKeys.rateLimit,
        lastUsedAt: apiKeys.lastUsedAt,
        expiresAt: apiKeys.expiresAt,
        isActive: apiKeys.isActive,
        revokedAt: apiKeys.revokedAt,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.tenantId, auth.tenant.id))
      .orderBy(desc(apiKeys.createdAt))

    return NextResponse.json({ data: rows })
  } catch (err) {
    console.error('[GET /api/dashboard/api-keys] error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// POST /api/dashboard/api-keys — create new key (returns plaintext ONCE)
// ---------------------------------------------------------------------------

const createSchema = z.object({
  name: z.string().min(2).max(100),
  permissions: z.array(z.enum(['read', 'write', 'delete'])).min(1).default(['read']),
  rateLimit: z.number().int().min(10).max(10_000).default(100),
  expiresAt: z.string().datetime().optional(),
})

export async function POST(request: NextRequest) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 })
    }

    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      )
    }
    const data = parsed.data

    const { key, hash, prefix } = generateApiKey()

    const [created] = await db
      .insert(apiKeys)
      .values({
        tenantId: auth.tenant.id,
        name: data.name,
        keyHash: hash,
        keyPrefix: prefix,
        permissions: data.permissions,
        rateLimit: data.rateLimit,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      })
      .returning({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        permissions: apiKeys.permissions,
        rateLimit: apiKeys.rateLimit,
        expiresAt: apiKeys.expiresAt,
        createdAt: apiKeys.createdAt,
      })

    return NextResponse.json(
      {
        data: created,
        // Plaintext key — shown only once. Front-end MUST surface this clearly
        // and tell the user it can't be recovered.
        key,
      },
      { status: 201 },
    )
  } catch (err) {
    console.error('[POST /api/dashboard/api-keys] error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
