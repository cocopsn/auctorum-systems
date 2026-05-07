/**
 * Cron: Send 24h and 1h reminders for upcoming medical appointments
 * Run: npx tsx scripts/cron-appointment-reminders.ts
 * Schedule: every 15 minutes via PM2
 */

import 'dotenv/config'
import { db, appointments, patients, tenants } from '@quote-engine/db'
import type { TenantConfig } from '@quote-engine/db'
import { eq, and, sql } from 'drizzle-orm'
import { sendWhatsAppMessage } from '@quote-engine/notifications/whatsapp'
import { formatBotMessage } from '../apps/medconcierge/src/lib/bot-messages'

const MAX_REMINDER_RETRIES = 3  // L-5: Max retries before giving up
const DEFAULT_TIMEZONE = 'America/Monterrey'

/**
 * Format a Date as 'YYYY-MM-DD HH:MM:SS' in a given timezone.
 * This is critical because appointments.date + appointments.start_time
 * are stored as naive local time (no timezone info), so comparisons
 * must use the same local time, NOT UTC.
 */
function formatLocalTimestamp(date: Date, tz: string = DEFAULT_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const get = (type: string) => parts.find(p => p.type === type)?.value || ''
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`
}

async function sendReminders() {
  const now = new Date()
  const nowLocal = formatLocalTimestamp(now)
  console.log(`[appointment-reminders] Starting at ${now.toISOString()} (local: ${nowLocal} ${DEFAULT_TIMEZONE})`)

  // ============================================================
  // 24-hour reminders
  // Find appointments 23-25 hours from now that haven't had 24h reminder
  // ============================================================
  const in23h = new Date(now.getTime() + 23 * 60 * 60 * 1000)
  const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000)

  // Format in local timezone to match naive DB timestamps
  const in23hLocal = formatLocalTimestamp(in23h)
  const in25hLocal = formatLocalTimestamp(in25h)

  console.log(`[appointment-reminders] 24h window: ${in23hLocal} to ${in25hLocal}`)

  const upcoming24h = await db
    .select({
      appointment: appointments,
      patient: patients,
    })
    .from(appointments)
    .innerJoin(patients, eq(patients.id, appointments.patientId))
    .where(
      and(
        sql`${appointments.status} IN ('scheduled', 'confirmed')`,
        eq(appointments.reminder24hSent, false),
        sql`(${appointments.date}::date + ${appointments.startTime}::time) BETWEEN ${in23hLocal}::timestamp AND ${in25hLocal}::timestamp`
      )
    )

  console.log(`[appointment-reminders] Found ${upcoming24h.length} appointments needing 24h reminder`)

  let reminders24hSent = 0

  for (const { appointment, patient } of upcoming24h) {
    try {
      const [tenant] = await db.select().from(tenants).where(eq(tenants.id, appointment.tenantId)).limit(1)
      if (!tenant) continue

      const config = tenant.config as TenantConfig
      if (!config.notifications?.whatsapp_reminder_24h) continue

      const displayDate = new Date(appointment.date + 'T12:00:00').toLocaleDateString('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
      const displayTime = appointment.startTime.slice(0, 5)
      const address = config.contact?.address || 'Consultar con el consultorio'

      let sent = false
      if (patient.phone) {
        // Doctor's customizable 24h reminder template (tenant.config.bot_messages
        // .appointment_reminder_24h). Falls back to DEFAULT_BOT_MESSAGES when
        // the doctor hasn't customized.
        const baseMessage = formatBotMessage(tenant, 'appointment_reminder_24h', {
          nombre: patient.name,
          fecha: displayDate,
          hora: displayTime,
        })
        sent = await sendWhatsAppMessage({
          to: patient.phone,
          message: `${baseMessage}\n\nConsultorio: ${address}`,
        })

        if (sent) {
          reminders24hSent++
          console.log(`[appointment-reminders] 24h reminder sent to ${patient.name} (${patient.phone})`)
        } else {
          console.error(`[appointment-reminders] 24h reminder FAILED for ${patient.name} (${patient.phone})`)
        }
      }

      // Mark as sent only when delivery succeeded or patient has no phone
      if (!patient.phone || sent) {
        await db
          .update(appointments)
          .set({ reminder24hSent: true, reminder24hSentAt: new Date() })
          .where(eq(appointments.id, appointment.id))
      }
    } catch (err) {
      console.error(`[appointment-reminders] Error sending 24h reminder for appointment ${appointment.id}:`, err)
    }
  }

  // ============================================================
  // 1-hour reminders
  // Find appointments 45-75 minutes from now that haven't had 1h reminder
  // ============================================================
  const in45m = new Date(now.getTime() + 45 * 60 * 1000)
  const in75m = new Date(now.getTime() + 75 * 60 * 1000)

  // Format in local timezone to match naive DB timestamps
  const in45mLocal = formatLocalTimestamp(in45m)
  const in75mLocal = formatLocalTimestamp(in75m)

  console.log(`[appointment-reminders] 1h window: ${in45mLocal} to ${in75mLocal}`)

  const upcoming1h = await db
    .select({
      appointment: appointments,
      patient: patients,
    })
    .from(appointments)
    .innerJoin(patients, eq(patients.id, appointments.patientId))
    .where(
      and(
        sql`${appointments.status} IN ('scheduled', 'confirmed')`,
        eq(appointments.reminder2hSent, false),
        sql`(${appointments.date}::date + ${appointments.startTime}::time) BETWEEN ${in45mLocal}::timestamp AND ${in75mLocal}::timestamp`
      )
    )

  console.log(`[appointment-reminders] Found ${upcoming1h.length} appointments needing 1h reminder`)

  let reminders1hSent = 0

  for (const { appointment, patient } of upcoming1h) {
    try {
      const [tenant] = await db.select().from(tenants).where(eq(tenants.id, appointment.tenantId)).limit(1)
      if (!tenant) continue

      const config = tenant.config as TenantConfig
      if (!config.notifications?.whatsapp_reminder_2h) continue

      const displayTime = appointment.startTime.slice(0, 5)
      const address = config.contact?.address || 'Consultar con el consultorio'

      let sent = false
      if (patient.phone) {
        // Same per-tenant customizable template approach as the 24h reminder.
        const baseMessage = formatBotMessage(tenant, 'appointment_reminder_1h', {
          nombre: patient.name,
          hora: displayTime,
        })
        sent = await sendWhatsAppMessage({
          to: patient.phone,
          message: [
            baseMessage,
            ``,
            `Consultorio: ${address}`,
            ``,
            `Le esperamos!`,
          ].join('\n'),
        })

        if (sent) {
          reminders1hSent++
          console.log(`[appointment-reminders] 1h reminder sent to ${patient.name} (${patient.phone})`)
        } else {
          console.error(`[appointment-reminders] 1h reminder FAILED for ${patient.name} (${patient.phone})`)
        }
      }

      // Mark as sent only when delivery succeeded or patient has no phone
      if (!patient.phone || sent) {
        await db
          .update(appointments)
          .set({ reminder2hSent: true, reminder2hSentAt: new Date() })
          .where(eq(appointments.id, appointment.id))
      }
    } catch (err) {
      console.error(`[appointment-reminders] Error sending 1h reminder for appointment ${appointment.id}:`, err)
    }
  }

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    localTime: formatLocalTimestamp(new Date()),
    action: 'appointment_reminders',
    reminders24h: { found: upcoming24h.length, sent: reminders24hSent },
    reminders1h: { found: upcoming1h.length, sent: reminders1hSent },
  }))

  console.log(`[appointment-reminders] Done at ${new Date().toISOString()} (local: ${formatLocalTimestamp(new Date())})`)
}

sendReminders()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[appointment-reminders] Fatal:', err)
    process.exit(1)
  })
