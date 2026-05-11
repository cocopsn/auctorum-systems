/**
 * cron-data-deletion
 *
 * Drains `data_deletion_requests` whose `scheduled_for <= now()`:
 *   1. flips status to 'processing'
 *   2. walks the purge chain for the user:
 *      - messages joined via conversations.externalId = meta_user_id
 *      - conversations themselves
 *      - patient_communications referencing the same phone (when known)
 *   3. records the data types deleted in `data_types_deleted` jsonb
 *   4. flips status to 'completed' (or 'failed' with `error`)
 *
 * Cadence: daily (PM2 cron_restart `0 4 * * *`, America/Monterrey).
 *
 * Pre-2026-05-11 the matching webhook returned a fake confirmation code
 * and nothing got deleted. That violated Meta Platform Policy + LFPDPPP
 * Art. 32. This cron is the second half of the fix.
 */

import 'dotenv/config'
import { and, eq, isNull, lte, sql } from 'drizzle-orm'
import {
  db,
  dataDeletionRequests,
  conversations,
  messages,
  patientCommunications,
} from '@quote-engine/db'

const BATCH = 10

async function purgeForMetaUser(externalUserId: string): Promise<string[]> {
  const deleted: string[] = []

  // 1. Find conversations matching this meta user_id (Instagram PSID
  //    + WhatsApp wa_id both land in conversations.external_id).
  const convs = await db
    .select({ id: conversations.id, channel: conversations.channel })
    .from(conversations)
    .where(eq(conversations.externalId, externalUserId))

  if (convs.length === 0) return deleted

  const convIds = convs.map((c) => c.id)
  deleted.push(`conversations(${convs.length})`)

  // 2. messages first (FK)
  const msgDelete = await db.execute(sql`
    DELETE FROM messages WHERE conversation_id IN (
      ${sql.join(convIds.map((id) => sql`${id}::uuid`), sql`, `)}
    )
  `)
  // postgres-js returns { count } on raw execute — best-effort log
  deleted.push(`messages(via_conversation_fk)`)

  // 3. conversations themselves
  await db.execute(sql`
    DELETE FROM conversations WHERE id IN (
      ${sql.join(convIds.map((id) => sql`${id}::uuid`), sql`, `)}
    )
  `)

  return deleted
}

async function main() {
  const start = Date.now()
  const now = new Date()
  console.log(`[data-deletion] starting at ${now.toISOString()}`)

  // Claim a batch atomically — only rows still 'pending' get processed,
  // and we flip them to 'processing' so a duplicate cron run can't pick
  // the same row twice (the unique processing_started_at acts as a soft
  // lock).
  const due = await db
    .select()
    .from(dataDeletionRequests)
    .where(
      and(
        eq(dataDeletionRequests.status, 'pending'),
        lte(dataDeletionRequests.scheduledFor, now),
      ),
    )
    .limit(BATCH)

  let completed = 0
  let failed = 0
  let skipped = 0

  for (const req of due) {
    // Atomic transition pending → processing. If another worker grabbed
    // it concurrently the WHERE filter on status='pending' returns 0
    // rows and we skip.
    const claim = await db
      .update(dataDeletionRequests)
      .set({ status: 'processing', processingStartedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(dataDeletionRequests.id, req.id), eq(dataDeletionRequests.status, 'pending')))
      .returning({ id: dataDeletionRequests.id })

    if (claim.length === 0) {
      skipped++
      continue
    }

    try {
      const deleted: string[] = []
      if (req.source === 'meta' && req.externalUserId) {
        const purged = await purgeForMetaUser(req.externalUserId)
        deleted.push(...purged)
      }

      // For 'user' and 'admin' sources, the request lives in the
      // metadata json — UI-driven ARCO requests. The set of tables to
      // purge per patient is the same plus patient_communications etc.
      if (req.patientId) {
        const pcomms = await db
          .delete(patientCommunications)
          .where(eq(patientCommunications.patientId, req.patientId))
          .returning({ id: patientCommunications.id })
        if (pcomms.length > 0) deleted.push(`patient_communications(${pcomms.length})`)
      }

      await db
        .update(dataDeletionRequests)
        .set({
          status: 'completed',
          completedAt: new Date(),
          dataTypesDeleted: deleted,
          updatedAt: new Date(),
        })
        .where(eq(dataDeletionRequests.id, req.id))
      completed++
      console.log(`[data-deletion] ✓ ${req.id} source=${req.source} purged=${deleted.join(', ') || 'none'}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await db
        .update(dataDeletionRequests)
        .set({ status: 'failed', error: message.slice(0, 1000), updatedAt: new Date() })
        .where(eq(dataDeletionRequests.id, req.id))
      failed++
      console.error(`[data-deletion] ✗ ${req.id}: ${message}`)
    }
  }

  const ms = Date.now() - start
  console.log(
    JSON.stringify({
      action: 'data_deletion_cycle',
      window_ms: ms,
      due: due.length,
      completed,
      failed,
      skipped,
      timestamp: new Date().toISOString(),
    }),
  )
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[cron-data-deletion] fatal', err)
    process.exit(1)
  })
