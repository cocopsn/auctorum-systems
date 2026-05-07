/**
 * Redis-backed rate limiter (INCR + EXPIRE, fixed-window).
 *
 * Replaces the previous in-memory `Map` which was broken in production:
 * each PM2 fork had its own counter, so `limit=5/min` actually allowed
 * 5*N requests per minute (where N = PM2 instances). Mirrors the helper
 * in `apps/medconcierge/src/lib/rate-limit.ts` byte-for-byte so the auth
 * routes behave identically across both apps.
 */
import IORedis from 'ioredis'

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379'

let redis: IORedis | null = null

function getRedis(): IORedis {
  if (!redis) {
    redis = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableOfflineQueue: false,
    })
    redis.connect().catch((err) => {
      console.error('[rate-limit] Redis connect error:', err)
    })
  }
  return redis
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ success: boolean; remaining: number }> {
  const windowSecs = Math.max(1, Math.ceil(windowMs / 1000))
  try {
    const r = getRedis()
    const fullKey = `rl:${key}`
    const current = await r.incr(fullKey)
    if (current === 1) {
      await r.expire(fullKey, windowSecs)
    }
    return {
      success: current <= limit,
      remaining: Math.max(0, limit - current),
    }
  } catch (err) {
    // Fail-open so a Redis hiccup doesn't take down the whole app.
    console.error('[rate-limit] Redis error, failing open:', err)
    return { success: true, remaining: limit }
  }
}

export function getClientIP(request: Request): string {
  const headers = request.headers
  return (
    headers.get('cf-connecting-ip') ||
    headers.get('x-real-ip') ||
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    '127.0.0.1'
  )
}
