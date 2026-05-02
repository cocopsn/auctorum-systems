export const dynamic = 'force-dynamic'

/**
 * POST /api/dashboard/patients/[id]/consents/[cid]/revoke
 * El paciente puede revocar un consentimiento. Marca revoked_at y
 * registra audit log. La fila NO se elimina (5 años de retención).
 */
import { NextRequest, NextResponse } from 'next/server'
import { eq, and, isNull } from 'drizzle-orm'
import { db, informedConsents, auditLog } from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'
import { validateOrigin } from '@/lib/csrf'

type RouteCtx = { params: { id: string; cid: string } }

export async function POST(req: NextRequest, { params }: RouteCtx) {
  if (!validateOrigin(req)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const [consent] = await db
    .select()
    .from(informedConsents)
    .where(
      and(
        eq(informedConsents.id, params.cid),
        eq(informedConsents.tenantId, auth.tenant.id),
        eq(informedConsents.patientId, params.id),
      ),
    )
    .limit(1)
  if (!consent) {
    return NextResponse.json({ error: 'Consentimiento no encontrado' }, { status: 404 })
  }
  if (consent.revokedAt) {
    return NextResponse.json(
      { error: 'Este consentimiento ya fue revocado' },
      { status: 400 },
    )
  }

  await db
    .update(informedConsents)
    .set({ revokedAt: new Date() })
    .where(eq(informedConsents.id, params.cid))

  await auditLog({
    tenantId: auth.tenant.id,
    userId: auth.user.id,
    action: 'consent.revoke',
    entity: `informed_consent:${params.cid}`,
    after: { procedureName: consent.procedureName, patientId: params.id },
  })

  return NextResponse.json({ success: true })
}
