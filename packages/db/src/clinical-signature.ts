/**
 * NOM-004-SSA3-2012 cryptographic signature for clinical records.
 *
 * Pre-2026-05-12 the doctor's signature was a base64 PNG embedded in
 * the locked record. That gives no integrity guarantee — anyone with
 * write access to the DB can mutate the row's contents after lock and
 * the PNG sits there looking authentic. NOM-004 §4.4 requires that
 * signed records "preserve their original form"; a hash over the
 * canonical payload at lock time is the cheap proof.
 *
 * We compute SHA-256 over a JSON serialization with sorted keys so the
 * hash is reproducible regardless of object property insertion order.
 *
 * Verification: `GET /api/verify?hash=<hex>` looks up the record by
 * `signature_hash`, recomputes from the stored fields, and returns
 * { ok: true, doctorName, cedula, signedAt, tenantName } — never any
 * clinical content.
 */
import { createHash } from 'crypto'

export interface ClinicalSignaturePayload {
  recordId: string
  tenantId: string
  patientId: string
  /** Editor content — HTML/JSON from TipTap. Whatever lives in clinical_records.content. */
  content: unknown
  doctorId: string
  doctorCedula: string
  doctorName: string
  vitalSigns: unknown
  diagnosisIcd10: string | null
  diagnosisText: string | null
  treatmentPlan: string | null
  prognosis: string | null
  /** ISO timestamp recorded at lock time. */
  signedAt: string
}

/**
 * Stable JSON.stringify that sorts keys recursively so the canonical
 * representation matches across producer/verifier even when the row
 * round-trips through JSON.parse / drizzle / etc.
 */
function canonicalize(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']'
  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>).sort()
    return (
      '{' +
      keys
        .map((k) => JSON.stringify(k) + ':' + canonicalize((value as Record<string, unknown>)[k]))
        .join(',') +
      '}'
    )
  }
  return JSON.stringify(value)
}

export function generateClinicalSignatureHash(payload: ClinicalSignaturePayload): string {
  const canonical = canonicalize(payload as unknown as Record<string, unknown>)
  return createHash('sha256').update(canonical).digest('hex')
}

export function verifyClinicalSignatureHash(
  payload: ClinicalSignaturePayload,
  expectedHash: string,
): boolean {
  // Timing-safe comparison would be ideal but the hashes are deterministic
  // and not secret — equality is fine.
  return generateClinicalSignatureHash(payload) === expectedHash
}
