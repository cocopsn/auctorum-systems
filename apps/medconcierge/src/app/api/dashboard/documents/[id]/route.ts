/**
 *  GET    /api/dashboard/documents/[id]            → metadata + signed URL
 *  PATCH  /api/dashboard/documents/[id]            → reassign / mark archived
 *  DELETE /api/dashboard/documents/[id]            → remove file + row
 */
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, documents, patients, DOCUMENT_STATUSES } from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'
import { validateOrigin } from '@/lib/csrf'
import { getDocumentSignedUrl, deleteDocument } from '@/lib/document-storage'

async function loadDoc(id: string, tenantId: string) {
  const [row] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.tenantId, tenantId)))
    .limit(1)
  return row ?? null
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const doc = await loadDoc(params.id, auth.tenant.id)
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const [patient] = doc.patientId
      ? await db
          .select({ id: patients.id, name: patients.name, phone: patients.phone })
          .from(patients)
          .where(eq(patients.id, doc.patientId))
          .limit(1)
      : []

    let signedUrl: string | null = null
    try {
      signedUrl = await getDocumentSignedUrl(doc.storagePath, 600)
    } catch (err) {
      console.warn('[documents] signed url:', err instanceof Error ? err.message : err)
    }

    return NextResponse.json({ document: doc, patient: patient ?? null, signedUrl })
  } catch (err: any) {
    console.error('[documents GET id] error:', err?.message || err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

const patchSchema = z.object({
  patientId: z.string().uuid().nullable().optional(),
  documentType: z
    .enum(['lab_result', 'radiology', 'prescription', 'referral', 'insurance', 'other'])
    .optional(),
  status: z.enum(DOCUMENT_STATUSES).optional(),
  aiSummary: z.string().max(500).optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 })
  }
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: 'no changes' }, { status: 400 })
  }

  try {
    const doc = await loadDoc(params.id, auth.tenant.id)
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // If we're assigning a patient, validate it belongs to this tenant
    if (parsed.data.patientId) {
      const [exists] = await db
        .select({ id: patients.id })
        .from(patients)
        .where(
          and(
            eq(patients.id, parsed.data.patientId),
            eq(patients.tenantId, auth.tenant.id),
          ),
        )
        .limit(1)
      if (!exists) {
        return NextResponse.json({ error: 'Paciente no existe en este tenant' }, { status: 400 })
      }
    }

    // status auto-derives from patientId unless explicitly set
    const nextStatus =
      parsed.data.status ??
      (parsed.data.patientId === null
        ? 'pending_assignment'
        : parsed.data.patientId
          ? 'assigned'
          : doc.status)

    const [updated] = await db
      .update(documents)
      .set({
        ...(parsed.data.patientId !== undefined && { patientId: parsed.data.patientId }),
        ...(parsed.data.documentType !== undefined && {
          documentType: parsed.data.documentType,
        }),
        ...(parsed.data.aiSummary !== undefined && { aiSummary: parsed.data.aiSummary }),
        status: nextStatus,
      })
      .where(and(eq(documents.id, params.id), eq(documents.tenantId, auth.tenant.id)))
      .returning()

    return NextResponse.json({ document: updated })
  } catch (err: any) {
    console.error('[documents PATCH] error:', err?.message || err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 })
  }
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const doc = await loadDoc(params.id, auth.tenant.id)
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Best-effort storage delete — DB cleanup proceeds even if storage fails
    // (we'd rather have an orphan blob than a stuck row in pending_assignment)
    try {
      await deleteDocument(doc.storagePath)
    } catch (err) {
      console.warn('[documents] storage delete failed:', err instanceof Error ? err.message : err)
    }

    await db
      .delete(documents)
      .where(and(eq(documents.id, params.id), eq(documents.tenantId, auth.tenant.id)))

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[documents DELETE] error:', err?.message || err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
