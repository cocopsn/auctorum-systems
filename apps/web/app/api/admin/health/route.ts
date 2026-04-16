import { NextResponse } from 'next/server';
import { db } from '@quote-engine/db';
import { sql } from 'drizzle-orm';
import { messageQueue } from '@quote-engine/events';
import IORedis from 'ioredis';

export const dynamic = 'force-dynamic';

export async function GET() {
  const start = Date.now();
  let dbStatus = 'down';
  let redisStatus = 'down';
  let queueStatus = 'down';
  let workersActive = 0;

  try {
    // Check DB
    await db.execute(sql`SELECT 1`);
    dbStatus = 'ok';
  } catch (e) {
    console.error('Healthcheck DB Error:', e);
  }

  try {
    // Check Redis & Queue
    const redis = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', { maxRetriesPerRequest: 1, showFriendlyErrorStack: true });
    await redis.ping();
    redisStatus = 'ok';
    
    // Check BullMQ workers
    const workers = await messageQueue.getWorkers();
    workersActive = workers.length;
    queueStatus = 'ok';
    
    await redis.quit();
  } catch (e) {
    console.error('Healthcheck Redis/Queue Error:', e);
  }

  const latencyMs = Date.now() - start;

  return NextResponse.json({
    api: 'ok',
    db: dbStatus,
    redis: redisStatus,
    queue: queueStatus,
    workers: workersActive,
    latency_ms: latencyMs,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
}
