/**
 * Storage helpers for the `documents` bucket. Different bucket from
 * `patient-files` because:
 *   - documents flow has a "pending assignment" stage where there's no
 *     patient_id yet (the AI needs time/help to figure it out)
 *   - retention/lifecycle rules might diverge later
 *
 * Bucket creation is best-effort on first upload — if the service role can
 * create buckets, we do it once and return. If not (RLS-locked Supabase),
 * the call no-ops and the upload proceeds; the bucket must exist already.
 *
 * Path layout:
 *     <tenantId>/<docId>-<safeFileName>
 *
 * Filename sanitization keeps it ASCII + underscores so paths don't break
 * across S3-compatible storage providers.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const DOCUMENTS_BUCKET = 'documents'

let cachedClient: SupabaseClient | null = null
let bucketCheckedAt = 0
let bucketReady = false

function getServiceClient(): SupabaseClient {
  if (cachedClient) return cachedClient
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'Supabase service role env vars missing (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)',
    )
  }
  cachedClient = createClient(url, key, { auth: { persistSession: false } })
  return cachedClient
}

/**
 * Idempotently ensure the `documents` bucket exists. Cached for 10 min so
 * we don't hammer Supabase on every upload.
 */
export async function ensureDocumentsBucket(): Promise<{
  ready: boolean
  reason?: string
}> {
  const TEN_MIN = 10 * 60 * 1000
  if (bucketReady && Date.now() - bucketCheckedAt < TEN_MIN) {
    return { ready: true }
  }
  try {
    const supabase = getServiceClient()
    const { data: existing, error: listErr } = await supabase.storage.listBuckets()
    if (listErr) {
      console.warn('[documents] listBuckets failed:', listErr.message)
      return { ready: false, reason: listErr.message }
    }
    const found = (existing ?? []).some((b: any) => b?.name === DOCUMENTS_BUCKET)
    if (found) {
      bucketReady = true
      bucketCheckedAt = Date.now()
      return { ready: true }
    }
    const { error: createErr } = await supabase.storage.createBucket(DOCUMENTS_BUCKET, {
      public: false,
      fileSizeLimit: 25 * 1024 * 1024, // 25 MB hard cap
    })
    if (createErr) {
      console.warn('[documents] createBucket failed:', createErr.message)
      return { ready: false, reason: createErr.message }
    }
    bucketReady = true
    bucketCheckedAt = Date.now()
    console.log('[documents] bucket created')
    return { ready: true }
  } catch (err) {
    return { ready: false, reason: err instanceof Error ? err.message : String(err) }
  }
}

function safeName(input: string): string {
  return input.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200)
}

export async function uploadDocument(params: {
  tenantId: string
  docId: string
  file: File
}): Promise<{ ok: true; path: string } | { ok: false; reason: string }> {
  const { tenantId, docId, file } = params
  const path = `${tenantId}/${docId}-${safeName(file.name || 'document')}`

  const ensure = await ensureDocumentsBucket()
  if (!ensure.ready) {
    return {
      ok: false,
      reason: `Bucket "${DOCUMENTS_BUCKET}" no disponible: ${ensure.reason ?? 'unknown'}. Crea el bucket en Supabase Studio.`,
    }
  }

  try {
    const supabase = getServiceClient()
    const { error } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(path, file, {
        contentType: file.type || 'application/octet-stream',
        cacheControl: '3600',
        upsert: false,
      })
    if (error) return { ok: false, reason: `Upload failed: ${error.message}` }
    return { ok: true, path }
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) }
  }
}

export async function getDocumentSignedUrl(
  storagePath: string,
  expiresInSeconds = 300,
): Promise<string> {
  const supabase = getServiceClient()
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds)
  if (error || !data) throw new Error(`Signed URL failed: ${error?.message ?? 'unknown'}`)
  return data.signedUrl
}

export async function deleteDocument(storagePath: string): Promise<void> {
  const supabase = getServiceClient()
  const { error } = await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath])
  if (error) throw new Error(`Delete failed: ${error.message}`)
}
