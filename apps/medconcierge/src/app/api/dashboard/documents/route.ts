/**
 * Dashboard endpoint para documents:
 *
 *   GET  /api/dashboard/documents  → list paginado con filtros
 *   POST /api/dashboard/documents  → multipart upload + AI analyze + auto-assign
 *
 * El POST hace todo en el mismo request: upload a Storage, extracción de texto
 * (PDF), análisis con gpt-4o-mini, fuzzy match a paciente por nombre, INSERT.
 * Si no encuentra paciente, status='pending_assignment' y la UI le da al
 * doctor opciones para asignar manualmente.
 */
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { and, eq, ilike, isNull, or, desc, sql, type SQL } from 'drizzle-orm'
import { z } from 'zod'
import {
  db,
  documents,
  patients,
  DOCUMENT_STATUSES,
  DOCUMENT_TYPES,
} from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'
import { validateOrigin } from '@/lib/csrf'
import { uploadDocument, ensureDocumentsBucket } from '@/lib/document-storage'
import { analyzeDocument, extractPdfText } from '@/lib/document-analyzer'

const MAX_FILE_BYTES = 25 * 1024 * 1024 // 25 MB
const ACCEPTED_MIMES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
])

// ─── GET ───────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const status = sp.get('status')
  const type = sp.get('type')
  const patientId = sp.get('patientId')
  const search = sp.get('search')?.trim()
  const limit = Math.min(parseInt(sp.get('limit') ?? '50'), 200)
  const offset = parseInt(sp.get('offset') ?? '0')

  try {
    const conditions: SQL[] = [eq(documents.tenantId, auth.tenant.id)]
    if (status && (DOCUMENT_STATUSES as readonly string[]).includes(status)) {
      conditions.push(eq(documents.status, status))
    } else if (status === 'unassigned') {
      conditions.push(isNull(documents.patientId))
    }
    if (type && (DOCUMENT_TYPES as readonly string[]).includes(type)) {
      conditions.push(eq(documents.documentType, type))
    }
    if (patientId) {
      conditions.push(eq(documents.patientId, patientId))
    }
    if (search) {
      const c = or(
        ilike(documents.fileName, `%${search}%`),
        ilike(documents.aiSummary, `%${search}%`),
      )
      if (c) conditions.push(c)
    }
    const where = and(...conditions)

    const items = await db
      .select({
        id: documents.id,
        fileName: documents.fileName,
        fileType: documents.fileType,
        fileSize: documents.fileSize,
        documentType: documents.documentType,
        documentDate: documents.documentDate,
        aiSummary: documents.aiSummary,
        status: documents.status,
        patientId: documents.patientId,
        patientName: patients.name,
        createdAt: documents.createdAt,
      })
      .from(documents)
      .leftJoin(patients, eq(patients.id, documents.patientId))
      .where(where)
      .orderBy(desc(documents.createdAt))
      .limit(limit)
      .offset(offset)

    return NextResponse.json({ items, limit, offset })
  } catch (err: any) {
    console.error('[documents GET] error:', err?.message || err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// ─── POST — multipart upload ───────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 })
  }

  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'invalid multipart body' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file requerido' }, { status: 400 })
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'Archivo muy grande (máx 25 MB)' }, { status: 413 })
  }
  if (!ACCEPTED_MIMES.has(file.type)) {
    return NextResponse.json(
      { error: `Tipo no soportado: ${file.type || 'desconocido'}. Solo PDF e imágenes.` },
      { status: 415 },
    )
  }

  // Patient hint from the uploader (manual override)
  const explicitPatientId = formData.get('patientId')
  const explicitPatientIdStr =
    typeof explicitPatientId === 'string' && explicitPatientId.trim().length > 0
      ? explicitPatientId.trim()
      : null

  // 1. Pre-extract text BEFORE we hit storage. If pdf-parse fails we still
  //    upload + analyze with empty text (AI will return neutral result).
  let extractedText = ''
  if (file.type === 'application/pdf') {
    try {
      const buf = Buffer.from(await file.arrayBuffer())
      extractedText = await extractPdfText(buf)
    } catch (err) {
      console.warn('[documents] pdf extract failed:', err instanceof Error ? err.message : err)
    }
  }

  // 2. Reserve a doc id so the storage path is final
  const reservedId = crypto.randomUUID()

  // 3. Upload to Supabase storage (creates the bucket on first call if perms allow)
  const uploadResult = await uploadDocument({
    tenantId: auth.tenant.id,
    docId: reservedId,
    file,
  })
  if (!uploadResult.ok) {
    return NextResponse.json({ error: uploadResult.reason }, { status: 502 })
  }

  // 4. AI analyze (best-effort)
  const analysis = await analyzeDocument(extractedText)

  // 5. Resolve patient: explicit param wins, then AI suggestion, then leave null
  let patientId: string | null = null
  if (explicitPatientIdStr) {
    const [exists] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(and(eq(patients.id, explicitPatientIdStr), eq(patients.tenantId, auth.tenant.id)))
      .limit(1)
    if (exists) patientId = exists.id
  }
  if (!patientId && analysis.patientName) {
    const [match] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(
        and(
          eq(patients.tenantId, auth.tenant.id),
          ilike(patients.name, `%${analysis.patientName}%`),
        ),
      )
      .limit(1)
    if (match) patientId = match.id
  }

  // 6. Persist
  const [created] = await db
    .insert(documents)
    .values({
      id: reservedId,
      tenantId: auth.tenant.id,
      patientId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      storagePath: uploadResult.path,
      documentType: analysis.type,
      extractedText: extractedText.slice(0, 5000) || null,
      aiSummary: analysis.summary,
      aiMetadata: { ...analysis },
      documentDate: analysis.documentDate,
      uploadedBy: auth.user.id,
      status: patientId ? 'assigned' : 'pending_assignment',
    })
    .returning()

  // 7. Suggest patients if not auto-assigned (UI shows them as picker)
  let suggestedPatients: Array<{ id: string; name: string }> = []
  if (!patientId && analysis.patientName) {
    const tokens = analysis.patientName
      .split(/\s+/)
      .filter((t) => t.length >= 2)
      .slice(0, 3)
    if (tokens.length > 0) {
      const orParts = tokens.map((t) => ilike(patients.name, `%${t}%`))
      const cond = orParts.length === 1 ? orParts[0] : or(...orParts)
      if (cond) {
        suggestedPatients = await db
          .select({ id: patients.id, name: patients.name })
          .from(patients)
          .where(and(eq(patients.tenantId, auth.tenant.id), cond))
          .limit(5)
      }
    }
  }

  return NextResponse.json({
    document: created,
    analysis,
    needsAssignment: !patientId,
    suggestedPatients,
  })
}
