import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

let redis: IORedis | null = null;

function getRedis(): IORedis {
  if (!redis) {
    redis = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    redis.connect().catch((err) => {
      console.error('[rate-limit] Redis connect error:', err);
    });
  }
  return redis;
}

/**
 * Redis-backed rate limiter using INCR + EXPIRE (fixed-window).
 *
 * @param key     Unique key for the rate-limit bucket (e.g. "magic-link:1.2.3.4")
 * @param limit   Maximum number of requests allowed within the window
 * @param windowMs  Window size in **milliseconds** (matches previous in-memory API)
 * @returns       { success, remaining }
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ success: boolean; remaining: number }> {
  const windowSecs = Math.max(1, Math.ceil(windowMs / 1000));
  try {
    const r = getRedis();
    const fullKey = `rl:${key}`;
    const current = await r.incr(fullKey);
    if (current === 1) {
      await r.expire(fullKey, windowSecs);
    }
    return {
      success: current <= limit,
      remaining: Math.max(0, limit - current),
    };
  } catch (err) {
    // Fail-open: if Redis is unreachable, allow the request so the app
    // stays available. Log the error for observability.
    console.error('[rate-limit] Redis error, failing open:', err);
    return { success: true, remaining: limit };
  }
}

/**
 * Extract the real client IP from the request, checking proxy headers
 * in order of trustworthiness:
 *   1. cf-connecting-ip  (Cloudflare)
 *   2. x-real-ip         (nginx / reverse proxy)
 *   3. x-forwarded-for   (first entry = original client)
 *   4. fallback to 127.0.0.1
 */
export function getClientIP(request: Request): string {
  const headers = request.headers;
  return (
    headers.get('cf-connecting-ip') ||
    headers.get('x-real-ip') ||
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    '127.0.0.1'
  );
}
