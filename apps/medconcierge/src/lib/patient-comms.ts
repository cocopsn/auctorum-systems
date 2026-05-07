/**
 * Helper to append entries to the patient_communications ledger.
 *
 * Always best-effort and fire-and-forget — a failure to track the comm must
 * NEVER block the actual email/WA send. Wrap calls in `void trackPatientComm(…)`
 * or .catch(() => {}).
 */

import { db, patientCommunications, type CommType } from '@quote-engine/db'

export type TrackCommArgs = {
  tenantId: string
  patientId: string
  type: CommType
  subject?: string | null
  content?: string | null
  recipient?: string | null
  externalId?: string | null
  metadata?: Record<string, unknown>
  createdBy?: string | null
  occurredAt?: Date
}

export async function trackPatientComm(args: TrackCommArgs): Promise<void> {
  if (!args.tenantId || !args.patientId || !args.type) return
  try {
    await db.insert(patientCommunications).values({
      tenantId: args.tenantId,
      patientId: args.patientId,
      type: args.type,
      subject: args.subject ?? null,
      content: args.content ?? null,
      recipient: args.recipient ?? null,
      externalId: args.externalId ?? null,
      metadata: args.metadata ?? {},
      createdBy: args.createdBy ?? null,
      occurredAt: args.occurredAt ?? new Date(),
    })
  } catch (err) {
    console.warn(
      '[patient-comms] track failed (non-fatal):',
      err instanceof Error ? err.message : err,
    )
  }
}
