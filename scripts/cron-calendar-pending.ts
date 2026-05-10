/**
 * cron-calendar-pending
 *
 * Drains the `pending_calendar_ops` table — operations that failed when
 * Google Calendar was unreachable. Runs every 5 minutes via PM2.
 *
 * The handler tries the same Google Calendar call that originally failed.
 * On success the row is marked processed; on failure attempts is bumped
 * and next_retry_at is pushed out exponentially. After 6 attempts the
 * op is dead-lettered (still marked processed so the queue keeps moving)
 * with the error message preserved on lastError for ops triage.
 */

import { eq } from 'drizzle-orm'
import { db, tenants } from '../packages/db'
import { processPendingCalendarOps } from '../packages/ai/calendar-fallback'
import {
  createCalendarEvent,
  updateCalendarEvent,
  cancelCalendarEvent,
  type CreateEventParams,
  type UpdateEventParams,
} from '../apps/medconcierge/src/lib/google-calendar'

async function main() {
  const start = Date.now()
  const result = await processPendingCalendarOps(async (op) => {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, op.tenantId)).limit(1)
    if (!tenant) throw new Error(`tenant ${op.tenantId} not found`)
    // Pre-2026-05-10 the call order was inverted (cfg first, then data),
    // matching an older `getCalendarConfig`-returning shape that no longer
    // exists. The real signatures take (params, tenantConfig?, tenantId?)
    // — passing cfg as the first arg made every retry throw or silently
    // noop, so pending_calendar_ops never drained. Now we hand the tenant
    // config + id directly to the calendar helpers and let them resolve
    // their own client.
    const tenantConfig = tenant.config as Record<string, unknown> | undefined
    const data = op.data as Record<string, unknown>
    const externalId = (data.googleEventId as string | undefined) ?? null

    if (op.operation === 'create') {
      await createCalendarEvent(data as unknown as CreateEventParams, tenantConfig, op.tenantId)
    } else if (op.operation === 'update' && externalId) {
      await updateCalendarEvent(externalId, data as unknown as UpdateEventParams, tenantConfig, op.tenantId)
    } else if (op.operation === 'delete' && externalId) {
      await cancelCalendarEvent(externalId, tenantConfig, op.tenantId)
    } else {
      throw new Error(`unsupported operation ${op.operation} (no externalId for update/delete)`)
    }
  }, 25)

  const ms = Date.now() - start
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    action: 'calendar_pending_cycle',
    ms,
    ...result,
  }))
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[cron-calendar-pending] fatal', err)
    process.exit(1)
  })
