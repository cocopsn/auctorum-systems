import { NextRequest, NextResponse } from 'next/server'
import { db, patients, patientFiles } from '@quote-engine/db'
import { eq, and } from 'drizzle-orm'
import { getPatientFileSignedUrl } from '@/lib/storage'
import { rateLimit, getClientIP } from '@/lib/rate-limit'

// ============================================================
// GET /api/portal/[token]/files/[fileId]
// Patient-facing file download — validates portal token, returns
// a short-lived signed URL. Rate-limited per token.
// ============================================================

type RouteCtx = { params: { token: string; fileId: string } }

export async function GET(_request: NextRequest, { params }: RouteCtx) {
  try {
    const { success: rateLimitOk } = await rateLimit(`portal-file:${params.token}`, 20, 60_000)
    if (!rateLimitOk) {
      return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })
    }

    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.portalToken, params.token))
      .limit(1)

    if (!patient) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const [file] = await db
      .select()
      .from(patientFiles)
      .where(and(
        eq(patientFiles.id, params.fileId),
        eq(patientFiles.patientId, patient.id),
        eq(patientFiles.tenantId, patient.tenantId),
      ))
      .limit(1)

    if (!file) {
      return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 })
    }

    const url = await getPatientFileSignedUrl(file.storagePath, 300)
    return NextResponse.json({ url, filename: file.filename })
  } catch (error) {
    console.error('Portal file download error:', error)
    return NextResponse.json({ error: 'Error al generar enlace' }, { status: 500 })
  }
}
