import { NextResponse } from 'next/server';
import { messageQueue } from '@quote-engine/events';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      messageQueue.getWaitingCount(),
      messageQueue.getActiveCount(),
      messageQueue.getCompletedCount(),
      messageQueue.getFailedCount(),
      messageQueue.getDelayedCount()
    ]);

    // get recent failed jobs for inspection
    const failedJobs = await messageQueue.getFailed(0, 10);

    return NextResponse.json({
      metrics: {
        waiting,
        active,
        completed,
        failed,
        delayed
      },
      recent_failures: failedJobs.map(j => ({
        id: j.id,
        tenantId: j.data?.tenantId,
        error: j.failedReason,
        failedAt: j.finishedOn
      }))
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
