/**
 * cron-dlq-monitor
 *
 * Picks dead-letter signals from across the system and surfaces them so
 * we don't silently lose work:
 *
 *   1. `webhook_failures` rows with attempts >= 5 (dead-lettered)
 *   2. BullMQ jobs in the `whatsapp_messages:failed` set (attempts
 *      exhausted, removeOnFail kept the last 200 around)
 *   3. `data_deletion_requests` stuck in 'processing' for >24h
 *
 * Output is a single JSON line per cycle to stdout — Sentry / BetterStack
 * can ingest the log, or you can grep PM2 logs for the structured tag.
 *
 * Cadence: every 15 minutes via PM2 cron_restart.
 *
 * Pre-2026-05-12 there was no cron monitoring these. A BullMQ job that
 * exhausted its 5 retries got moved to the failed set and forgotten
 * forever (no UI, no email, no Slack). For a medical SaaS that's
 * "patient sent a message and the bot lost it" without any signal.
 */

import 'dotenv/config'
import { and, eq, gte, lte, sql } from 'drizzle-orm'
import { db, webhookFailures, dataDeletionRequests } from '@quote-engine/db'
import { Queue } from 'bullmq'
import IORedis from 'ioredis'

async function main() {
  const start = Date.now()

  // 1. Dead-lettered webhook_failures rows (attempts maxed)
  const [{ deadCount = 0 } = { deadCount: 0 }] = (await db.execute(sql`
    SELECT COUNT(*)::int AS "deadCount"
    FROM webhook_failures
    WHERE attempts >= 5 AND resolved_at IS NULL
  `)) as unknown as Array<{ deadCount: number }>

  // 2. BullMQ failed jobs across the WA queue
  let bullFailedCount = 0
  let bullSampleIds: string[] = []
  try {
    const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379'
    const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null })
    const queue = new Queue('whatsapp_messages', { connection })
    const failed = await queue.getFailed(0, 9)
    bullFailedCount = await queue.getFailedCount()
    bullSampleIds = failed.map((j) => String(j.id))
    await queue.close()
    await connection.quit()
  } catch (err) {
    console.warn('[dlq-monitor] bullmq probe failed (non-fatal):', err instanceof Error ? err.message : err)
  }

  // 3. data_deletion_requests stuck > 24h in processing
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const stuckDeletions = await db
    .select({ id: dataDeletionRequests.id })
    .from(dataDeletionRequests)
    .where(
      and(
        eq(dataDeletionRequests.status, 'processing'),
        lte(dataDeletionRequests.processingStartedAt, cutoff),
      ),
    )

  const ms = Date.now() - start
  const payload = {
    action: 'dlq_monitor',
    elapsed_ms: ms,
    webhook_dead_letter_count: deadCount,
    bullmq_failed_count: bullFailedCount,
    bullmq_failed_sample_ids: bullSampleIds,
    deletion_stuck_count: stuckDeletions.length,
    deletion_stuck_ids: stuckDeletions.map((s) => s.id),
    severity:
      deadCount > 0 || bullFailedCount > 10 || stuckDeletions.length > 0 ? 'alert' : 'ok',
    timestamp: new Date().toISOString(),
  }

  // PM2 logrotate captures stdout; Sentry/BetterStack can grep for
  // `"severity":"alert"` once the user wires log forwarding.
  console.log(JSON.stringify(payload))

  // Optional: ping healthchecks.io so the absence of a successful run
  // also alerts. The HEALTHCHECK_DLQ_URL env (off by default) points
  // at a healthchecks.io UUID URL — we GET it on success.
  if (process.env.HEALTHCHECK_DLQ_URL) {
    try {
      await fetch(process.env.HEALTHCHECK_DLQ_URL, { method: 'GET' })
    } catch {
      /* ignore */
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[cron-dlq-monitor] fatal', err)
    process.exit(1)
  })
