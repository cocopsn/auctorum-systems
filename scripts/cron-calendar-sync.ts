/**
 * Calendar Sync Cron — Runs every 5 minutes via PM2
 * Syncs Google Calendar events with appointments DB bidirectionally.
 */

import { eq, and, gte, lte, sql, isNull } from "drizzle-orm"
import { db, tenants, appointments, patients } from "@quote-engine/db"
import {
  getCalendarConfig,
  listCalendarEvents,
  type CalendarEvent,
} from "../../apps/medconcierge/src/lib/google-calendar"

async function syncTenantCalendar(tenant: any) {
  const config = (tenant.config as Record<string, any>) || {}
  const calConfig = getCalendarConfig(config)
  if (!calConfig) return

  const now = new Date()
  const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

  try {
    const events = await listCalendarEvents(
      now.toISOString(),
      twoWeeksLater.toISOString(),
      config
    )

    console.log(`[calendar-sync] ${tenant.slug}: ${events.length} events from GCal`)

    for (const event of events) {
      if (!event.start || !event.id) continue

      // Check if we already have this event
      const [existing] = await db.execute(
        sql`SELECT id, status FROM appointments WHERE google_event_id = ${event.id} AND tenant_id = ${tenant.id} LIMIT 1`
      ) as any[]

      if (existing) {
        // Check if event was cancelled in GCal
        if (event.status === "cancelled" && existing.status !== "cancelled") {
          await db
            .update(appointments)
            .set({ status: "cancelled", cancelledAt: new Date() })
            .where(eq(appointments.id, existing.id))
          console.log(`[calendar-sync] ${tenant.slug}: cancelled appointment ${existing.id}`)
        }
        // Could also check for time changes here
      }
      // Note: We don't create new appointments from GCal events automatically
      // because we need a patient association. This is a safety measure.
    }
  } catch (e) {
    console.error(`[calendar-sync] ${tenant.slug} error:`, e)
  }
}

async function main() {
  console.log("[calendar-sync] Starting sync...")

  const activeTenants = await db
    .select()
    .from(tenants)
    .where(and(eq(tenants.isActive, true), isNull(tenants.deletedAt)))

  for (const tenant of activeTenants) {
    await syncTenantCalendar(tenant)
  }

  console.log("[calendar-sync] Sync complete")
  process.exit(0)
}

main().catch(e => {
  console.error("[calendar-sync] Fatal error:", e)
  process.exit(1)
})
