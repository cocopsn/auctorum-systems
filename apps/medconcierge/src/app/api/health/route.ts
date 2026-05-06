export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@quote-engine/db'
import { isRedisHealthy } from '@quote-engine/queue'
import { getCircuitStatus } from '@quote-engine/ai'

/**
 * GET /api/health
 *
 * Liveness/readiness probe for Nginx upstream checks and uptime monitors.
 * Returns 200 only when the DB is reachable; downstream services (Redis,
 * OpenAI breaker) are reported but don't gate the 200 because the app can
 * still serve degraded with the fallback paths.
 */
export async function GET() {
  const startedAt = Date.now()
  const checks: Record<string, unknown> = {
    app: true,
    timestamp: new Date().toISOString(),
  }

  // DB — required for healthy
  try {
    await Promise.race([
      db.execute(sql`SELECT 1`),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('db timeout')), 2000),
      ),
    ])
    checks.db = true
  } catch (err) {
    checks.db = false
    checks.dbError = err instanceof Error ? err.message : String(err)
  }

  // Redis — degraded if down, not a hard failure (we have sync fallbacks)
  try {
    checks.redis = await isRedisHealthy()
  } catch {
    checks.redis = false
  }

  // OpenAI circuit breaker status — informational
  try {
    checks.openai = getCircuitStatus()
  } catch {
    checks.openai = { open: false, error: 'unable to read breaker status' }
  }

  checks.uptimeMs = Math.round(process.uptime() * 1000)
  checks.tookMs = Date.now() - startedAt

  const healthy = checks.db === true
  return NextResponse.json(checks, {
    status: healthy ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  })
}
