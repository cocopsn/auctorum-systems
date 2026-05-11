/**
 * GET /api/verify?hash=<sha256-hex>
 *
 * Public endpoint — no auth required — that confirms a clinical-record
 * signature exists in the system. NEVER returns clinical content, only
 * the bare facts a third party (a court, an audit, a curious patient)
 * needs to confirm authenticity:
 *
 *   - That a record with this hash exists
 *   - The doctor's name + cédula profesional
 *   - The signing timestamp
 *   - The tenant (clinic) name
 *
 * Use case: the printed PDF includes "Firma digital: <hash> —
 * verificable en /verificar?hash=<hash>". Anyone can hit that link and
 * confirm the record wasn't fabricated.
 *
 * P2-1 of the 2026-05-12 audit.
 */
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db, clinicalRecords, tenants } from '@quote-engine/db'
import { eq } from 'drizzle-orm'

const HASH_RE = /^[0-9a-f]{64}$/i

export async function GET(request: NextRequest) {
  const hash = request.nextUrl.searchParams.get('hash') ?? ''
  if (!HASH_RE.test(hash)) {
    return NextResponse.json(
      { ok: false, error: 'hash debe ser SHA-256 hex de 64 caracteres' },
      { status: 400 },
    )
  }

  // Lookup by signature_hash. Idx exists from migration 0060.
  const [row] = await db
    .select({
      id: clinicalRecords.id,
      tenantId: clinicalRecords.tenantId,
      lockedAt: clinicalRecords.lockedAt,
      doctorName: clinicalRecords.doctorName,
      doctorCedula: clinicalRecords.doctorCedula,
    })
    .from(clinicalRecords)
    .where(eq(clinicalRecords.signatureHash, hash.toLowerCase()))
    .limit(1)

  if (!row) {
    // Don't leak whether the hash format was valid but unknown vs.
    // record-doesn't-exist; uniform 404 either way.
    return NextResponse.json(
      { ok: false, found: false, message: 'No se encontró un registro con esa firma.' },
      { status: 404 },
    )
  }

  const [tenant] = await db
    .select({ name: tenants.name })
    .from(tenants)
    .where(eq(tenants.id, row.tenantId))
    .limit(1)

  return NextResponse.json({
    ok: true,
    found: true,
    record: {
      // Intentionally omit: patient name, clinical content, diagnoses,
      // anything PHI-tagged. The hash already commits the content; this
      // endpoint only confirms WHO signed and WHEN.
      doctorName: row.doctorName,
      doctorCedula: row.doctorCedula,
      signedAt: row.lockedAt,
      tenantName: tenant?.name ?? null,
    },
  })
}
