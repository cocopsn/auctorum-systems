import { NextRequest, NextResponse } from 'next/server';
import { db } from '@quote-engine/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded && !forwarded.startsWith('127.0.0.1')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const start = Date.now();
    await db.execute(sql`SELECT 1`);
    const dbLatency = Date.now() - start;

    const mem = process.memoryUsage();
    return NextResponse.json({
      status: 'ok',
      db: { connected: true, latencyMs: dbLatency },
      uptime: Math.round(process.uptime()),
      memory: {
        rss: Math.round(mem.rss / 1024 / 1024),
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json({
      status: 'degraded',
      db: { connected: false, error: (e as Error).message },
    }, { status: 503 });
  }
}
