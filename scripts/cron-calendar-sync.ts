/**
 * Calendar Sync Cron — Runs every 5 minutes via PM2
 * Bidirectional sync: GCal <-> appointments DB.
 * - Detects cancellations in GCal and marks appointments cancelled
 * - Detects time changes in GCal and updates appointments
 * - Creates appointments from new GCal events (matched by patient name)
 * - Detects deleted GCal events and marks corresponding appointments cancelled
 */

import { eq, and, sql, isNull, isNotNull } from "drizzle-orm"
import { db, tenants, appointments, patients, appointmentEvents } from "@quote-engine/db"
import {
  getCalendarConfig,
  listCalendarEvents,
  type CalendarEvent,
} from "../apps/medconcierge/src/lib/google-calendar"
import { Redis } from 'ioredis'

// --------------- Helpers ---------------

function parseEventDateTime(dt: string): { date: string; time: string } | null {
  try {
    const d = new Date(dt)
    if (isNaN(d.getTime())) return null
    const date = d.toISOString().split("T")[0]
    const time = d.toTimeString().slice(0, 5) + ":00"
    return { date, time }
  } catch {
    return null
  }
}

function extractPatientName(summary: string): string | null {
  // Match patterns like "Cita Dermatologia - Juan Perez" or "Consulta - Maria Lopez"
  const dashMatch = summary.match(/[-\u2013]\s*(.+)$/i)
  if (dashMatch) return dashMatch[1].trim()
  return summary.trim() || null
}

// --------------- Sync one tenant ---------------

async function syncTenantCalendar(tenant: any) {
  const config = (tenant.config as Record<string, any>) || {}
  const calConfig = getCalendarConfig(config, tenant.id)
  if (!calConfig) return

  const now = new Date()
  const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

  try {
    const events = await listCalendarEvents(
      now.toISOString(),
      twoWeeksLater.toISOString(),
      config,
      tenant.id,
    )

    console.log(`[calendar-sync] ${tenant.slug}: ${events.length} events from GCal`)

    // Track which google_event_ids we saw in this sync
    const seenGoogleEventIds = new Set<string>()

    for (const event of events) {
      if (!event.start || !event.id) continue

      seenGoogleEventIds.add(event.id)

      // Check if we already track this event
      const [existing] = await db.execute(
        sql`SELECT id, status, date, start_time FROM appointments WHERE google_event_id = ${event.id} AND tenant_id = ${tenant.id} LIMIT 1`
      ) as any[]

      if (existing) {
        // --- Handle cancellation ---
        if (event.status === "cancelled" && existing.status !== "cancelled") {
          await db
            .update(appointments)
            .set({ status: "cancelled", cancelledAt: new Date() })
            .where(eq(appointments.id, existing.id))

          await db.insert(appointmentEvents).values({
            appointmentId: existing.id,
            tenantId: tenant.id,
            eventType: "cancelled",
            metadata: { source: "gcal_sync", reason: "Cancelled in Google Calendar" },
          })

          console.log(`[calendar-sync] ${tenant.slug}: cancelled appointment ${existing.id}`)
        }

        // --- Handle time/date changes ---
        if (event.status !== "cancelled") {
          const parsed = parseEventDateTime(event.start)
          if (parsed && (parsed.date !== existing.date || parsed.time !== existing.start_time)) {
            const endParsed = parseEventDateTime(event.end)
            const updateData: Record<string, any> = {
              date: parsed.date,
              startTime: parsed.time,
            }
            if (endParsed) updateData.endTime = endParsed.time

            await db
              .update(appointments)
              .set(updateData)
              .where(eq(appointments.id, existing.id))

            await db.insert(appointmentEvents).values({
              appointmentId: existing.id,
              tenantId: tenant.id,
              eventType: "updated",
              metadata: {
                source: "gcal_sync",
                oldDate: existing.date,
                oldTime: existing.start_time,
                newDate: parsed.date,
                newTime: parsed.time,
              },
            })

            console.log(`[calendar-sync] ${tenant.slug}: updated appointment ${existing.id} time from GCal`)
          }
        }
      } else if (event.status !== "cancelled") {
        // --- New event in GCal: try to create appointment ---
        const patientName = extractPatientName(event.summary)
        if (!patientName) continue

        const startParsed = parseEventDateTime(event.start)
        const endParsed = parseEventDateTime(event.end)
        if (!startParsed) continue

        // Try exact match then fuzzy
        const [matchedPatient] = await db
          .select()
          .from(patients)
          .where(
            and(
              eq(patients.tenantId, tenant.id),
              sql`LOWER(${patients.name}) = LOWER(${patientName})`
            )
          )
          .limit(1)

        const patient = matchedPatient || await (async () => {
          const [fuzzy] = await db
            .select()
            .from(patients)
            .where(
              and(
                eq(patients.tenantId, tenant.id),
                sql`LOWER(${patients.name}) LIKE ${'%' + patientName.toLowerCase() + '%'}`
              )
            )
            .limit(1)
          return fuzzy || null
        })()

        if (!patient) {
          console.log(`[calendar-sync] ${tenant.slug}: no patient match for "${patientName}", skipping`)
          continue
        }

        await createAppointmentFromEvent(tenant, patient, event, startParsed, endParsed)
      }
    }

    // --- Reverse check: appointments with google_event_id NOT found in GCal ---
    // These are events that were completely deleted from Google Calendar
    const trackedAppointments = await db
      .select({ id: appointments.id, googleEventId: appointments.googleEventId, status: appointments.status })
      .from(appointments)
      .where(
        and(
          eq(appointments.tenantId, tenant.id),
          isNotNull(appointments.googleEventId),
          sql`${appointments.status} NOT IN ('cancelled', 'completed')`,
          sql`${appointments.date} >= ${now.toISOString().split("T")[0]}`
        )
      )

    for (const appt of trackedAppointments) {
      if (appt.googleEventId && !seenGoogleEventIds.has(appt.googleEventId)) {
        await db
          .update(appointments)
          .set({ status: "cancelled", cancelledAt: new Date() })
          .where(eq(appointments.id, appt.id))

        await db.insert(appointmentEvents).values({
          appointmentId: appt.id,
          tenantId: tenant.id,
          eventType: "cancelled",
          metadata: { source: "gcal_sync", reason: "Event deleted from Google Calendar" },
        })

        console.log(`[calendar-sync] ${tenant.slug}: cancelled appointment ${appt.id} (GCal event ${appt.googleEventId} no longer exists)`)
      }
    }
  } catch (e: any) {
    // If OAuth token is invalid, mark calendar as disconnected
    if (e?.message?.includes('invalid_grant') || e?.message?.includes('Token has been expired or revoked')) {
      console.error(`[calendar-sync] ${tenant.slug}: OAuth token revoked, marking disconnected`)
      const tenantConfig = (tenant.config as Record<string, any>) || {}
      if (tenantConfig.googleCalendar?.oauth) {
        delete tenantConfig.googleCalendar.oauth
        delete tenantConfig.googleCalendar.mode
        await db.update(tenants).set({ config: tenantConfig, updatedAt: new Date() }).where(eq(tenants.id, tenant.id))
      }
    } else {
      console.error(`[calendar-sync] ${tenant.slug} error:`, e)
    }
  }
}

async function createAppointmentFromEvent(
  tenant: any,
  patient: any,
  event: CalendarEvent,
  startParsed: { date: string; time: string },
  endParsed: { date: string; time: string } | null
) {
  const defaultEndTime = (() => {
    const [h, m] = startParsed.time.split(":").map(Number)
    const totalMin = h * 60 + m + 30
    const eh = Math.floor(totalMin / 60).toString().padStart(2, "0")
    const em = (totalMin % 60).toString().padStart(2, "0")
    return `${eh}:${em}:00`
  })()

  const [created] = await db
    .insert(appointments)
    .values({
      tenantId: tenant.id,
      patientId: patient.id,
      date: startParsed.date,
      startTime: startParsed.time,
      endTime: endParsed?.time || defaultEndTime,
      reason: event.description || "Creada desde Google Calendar",
      status: "scheduled",
      googleEventId: event.id,
    })
    .returning()

  if (created) {
    await db.insert(appointmentEvents).values({
      appointmentId: created.id,
      tenantId: tenant.id,
      eventType: "created",
      metadata: { source: "gcal_sync", gcalEventId: event.id, gcalSummary: event.summary },
    })

    console.log(`[calendar-sync] ${tenant.slug}: created appointment ${created.id} from GCal event "${event.summary}"`)
  }
}

// --------------- Main ---------------

async function main() {
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')
  const LOCK_KEY = 'lock:calendar-sync'
  const acquired = await redis.set(LOCK_KEY, Date.now().toString(), 'EX', 300, 'NX')
  if (!acquired) {
    console.log("[calendar-sync] Already running, skipping.")
    await redis.quit()
    process.exit(0)
  }
  try {
    console.log("[calendar-sync] Starting bidirectional sync...")

    const activeTenants = await db
      .select()
      .from(tenants)
      .where(and(eq(tenants.isActive, true), isNull(tenants.deletedAt)))

    for (const tenant of activeTenants) {
      await syncTenantCalendar(tenant)
    }

    console.log("[calendar-sync] Sync complete")
  } finally {
    await redis.del(LOCK_KEY)
    await redis.quit()
  }
  process.exit(0)
}

main().catch(e => {
  console.error("[calendar-sync] Fatal error:", e)
  process.exit(1)
})
