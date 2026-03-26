import { NextResponse } from 'next/server';
import { db } from '@quote-engine/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const start = Date.now();
  let dbStatus: 'connected' | 'error' = 'error';
  let dbLatencyMs = -1;

  try {
    const dbStart = Date.now();
    await db.execute(sql`SELECT 1`);
    dbLatencyMs = Date.now() - dbStart;
    dbStatus = 'connected';
  } catch {
    // DB unreachable — reported via dbStatus
  }

  const overall = dbStatus === 'connected' ? 'ok' : 'degraded';

  return NextResponse.json(
    {
      status: overall,
      version: '0.1.0',
      app: 'auctorum-medconcierge',
      uptime: process.uptime(),
      db: dbStatus,
      dbLatencyMs,
      responseTimeMs: Date.now() - start,
      timestamp: new Date().toISOString(),
    },
    { status: overall === 'ok' ? 200 : 503 },
  );
}
