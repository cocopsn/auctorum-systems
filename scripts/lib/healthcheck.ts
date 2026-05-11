/**
 * Lightweight healthchecks.io / Better Uptime "heartbeat" helper for
 * crons. Each cron declares its name; if HEALTHCHECK_<NAME>_URL env is
 * set (uppercased), we GET it on successful completion (and POST a
 * /fail variant on failure).
 *
 * Wire up steps:
 *   1. Create a check at healthchecks.io (or BetterStack) per cron.
 *   2. Add the UUID URL to the VPS .env.local as
 *      HEALTHCHECK_REMINDERS_URL=https://hc-ping.com/<uuid>
 *      HEALTHCHECK_CALENDAR_SYNC_URL=...
 *      etc.
 *   3. Wrap each cron's main() in withHealthcheck('REMINDERS', main).
 *
 * Absence of the env var = no-op (so cron still runs in environments
 * without the monitoring set up).
 */

function urlFor(name: string): string | null {
  const envKey = `HEALTHCHECK_${name.toUpperCase().replace(/-/g, '_')}_URL`
  return process.env[envKey] ?? null
}

export async function pingHealthcheck(name: string, suffix: '' | '/fail' = ''): Promise<void> {
  const base = urlFor(name)
  if (!base) return
  try {
    // 5s timeout — never let a slow healthcheck block the cron exit.
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 5000)
    await fetch(base + suffix, { method: 'GET', signal: ctrl.signal }).catch(() => {})
    clearTimeout(t)
  } catch {
    /* swallow */
  }
}

/**
 * Wrap a cron's main() so success → ping, failure → /fail ping. Exit
 * code is preserved.
 */
export async function withHealthcheck<T>(name: string, fn: () => Promise<T>): Promise<T> {
  try {
    const result = await fn()
    await pingHealthcheck(name, '')
    return result
  } catch (err) {
    await pingHealthcheck(name, '/fail')
    throw err
  }
}
