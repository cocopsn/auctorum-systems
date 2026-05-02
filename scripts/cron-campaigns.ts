/**
 * Cron: Pick up scheduled campaigns whose `scheduledAt` has passed and
 * transition them to `sending` + enqueue on the BullMQ campaigns queue.
 *
 * Run: npx tsx scripts/cron-campaigns.ts
 * Schedule: every minute via PM2 cron_restart
 */

import { db, campaigns } from '../packages/db/index'
import { and, eq, lte } from 'drizzle-orm'
import { createQueue } from '../packages/queue/src/index'

async function main() {
  const now = new Date()
  const due = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.status, 'scheduled'), lte(campaigns.scheduledAt, now)))

  if (due.length === 0) {
    console.log('[cron-campaigns] No scheduled campaigns due')
    return
  }

  const queue = createQueue('whatsapp_campaigns')
  let dispatched = 0

  for (const c of due) {
    try {
      // Move to sending state
      await db
        .update(campaigns)
        .set({
          status: 'sending',
          startedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(campaigns.id, c.id))

      // Enqueue (idempotent via jobId — same campaign won't be enqueued twice)
      await queue.add(
        'send-campaign',
        { tenant_id: c.tenantId, campaignId: c.id },
        { jobId: `campaign:${c.id}` },
      )
      dispatched++
      console.log(`[cron-campaigns] Dispatched campaign ${c.id} (tenant=${c.tenantId})`)
    } catch (err) {
      console.error(`[cron-campaigns] Failed to dispatch ${c.id}:`, err)
    }
  }

  console.log(`[cron-campaigns] Dispatched ${dispatched} of ${due.length} campaigns`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[cron-campaigns] Fatal:', err)
    process.exit(1)
  })
