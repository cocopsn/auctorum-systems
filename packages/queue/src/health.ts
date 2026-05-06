/**
 * Lightweight Redis health helper. Avoids holding a permanent connection
 * just for health checks; uses the shared connection from `getConnection`.
 */

import { getConnection } from './index'

let lastChecked = 0
let lastResult = false
const CACHE_MS = 5_000 // don't ping more than once every 5s

export async function isRedisHealthy(): Promise<boolean> {
  const now = Date.now()
  if (now - lastChecked < CACHE_MS) return lastResult
  lastChecked = now
  try {
    const r = getConnection()
    const pong = await Promise.race([
      r.ping(),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('redis ping timeout')), 1500),
      ),
    ])
    lastResult = pong === 'PONG'
    return lastResult
  } catch {
    lastResult = false
    return false
  }
}

export function snapshotRedisHealth(): { lastChecked: number; healthy: boolean } {
  return { lastChecked, healthy: lastResult }
}
