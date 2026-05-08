/**
 * BullMQ queue inspector — admin-only.
 *
 * Was previously **unauthenticated** and leaked tenantId + failure reasons
 * for every recent failed WhatsApp job. Now gated by `requireSuperadmin`
 * which checks the same allowlist used by `/superadmin/*` pages.
 */
import { NextResponse } from 'next/server'
import { messageQueue } from '@quote-engine/events'
import { requireSuperadmin } from '@/lib/superadmin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireSuperadmin()
  if (guard instanceof NextResponse) return guard

  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      messageQueue.getWaitingCount(),
      messageQueue.getActiveCount(),
      messageQueue.getCompletedCount(),
      messageQueue.getFailedCount(),
      messageQueue.getDelayedCount(),
    ])

    const failedJobs = await messageQueue.getFailed(0, 10)

    return NextResponse.json({
      metrics: { waiting, active, completed, failed, delayed },
      recent_failures: failedJobs.map((j) => ({
        id: j.id,
        tenantId: j.data?.tenantId,
        error: j.failedReason,
        failedAt: j.finishedOn,
      })),
    })
  } catch (err: any) {
    // Never echo the raw error message to the client — it can include Redis
    // connection strings or internal job payload data.
    console.error('[admin/queue] error:', err?.message || err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
