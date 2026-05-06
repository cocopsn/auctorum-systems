export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db, apiKeys } from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'
import { validateOrigin } from '@/lib/csrf'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ---------------------------------------------------------------------------
// DELETE /api/dashboard/api-keys/[id] — revoke (soft delete)
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 })
    }
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!UUID_RE.test(params.id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }

    const result = await db
      .update(apiKeys)
      .set({ isActive: false, revokedAt: new Date() })
      .where(and(eq(apiKeys.id, params.id), eq(apiKeys.tenantId, auth.tenant.id)))
      .returning({ id: apiKeys.id })

    if (result.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ ok: true, id: params.id })
  } catch (err) {
    console.error('[DELETE /api/dashboard/api-keys/[id]] error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
