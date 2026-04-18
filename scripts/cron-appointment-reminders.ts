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

async function sendReminders() {
  const now = new Date()
  console.log(`[appointment-reminders] Starting at ${now.toISOString()}`)

  // ============================================================
  // 24-hour reminders
  // Find appointments 23-25 hours from now that haven't had 24h reminder
  // ============================================================
  const in23h = new Date(now.getTime() + 23 * 60 * 60 * 1000)
  const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000)

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
        sql`(${appointments.date}::date + ${appointments.startTime}::time) BETWEEN ${in23h.toISOString()}::timestamp AND ${in25h.toISOString()}::timestamp`
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

      if (patient.phone) {
        const sent = await sendWhatsAppMessage({
          to: patient.phone,
          message: [
            `Hola ${patient.name}, le recordamos que tiene cita manana ${displayDate} a las ${displayTime} con ${tenant.name}.`,
            ``,
            `Consultorio: ${address}`,
            ``,
            `Confirma su asistencia? Responda SI para confirmar o NO para cancelar.`,
          ].join('\n'),
        })

        if (sent) {
          reminders24hSent++
          console.log(`[appointment-reminders] 24h reminder sent to ${patient.name} (${patient.phone})`)
        } else {
          console.error(`[appointment-reminders] 24h reminder FAILED for ${patient.name} (${patient.phone})`)
        }
      }

      // Mark as sent regardless to prevent spam on retry
      await db
        .update(appointments)
        .set({ reminder24hSent: true, reminder24hSentAt: new Date() })
        .where(eq(appointments.id, appointment.id))
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
        sql`(${appointments.date}::date + ${appointments.startTime}::time) BETWEEN ${in45m.toISOString()}::timestamp AND ${in75m.toISOString()}::timestamp`
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

      if (patient.phone) {
        const sent = await sendWhatsAppMessage({
          to: patient.phone,
          message: [
            `Hola ${patient.name}, su cita es en 1 hora (${displayTime}) con ${tenant.name}.`,
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

      await db
        .update(appointments)
        .set({ reminder2hSent: true, reminder2hSentAt: new Date() })
        .where(eq(appointments.id, appointment.id))
    } catch (err) {
      console.error(`[appointment-reminders] Error sending 1h reminder for appointment ${appointment.id}:`, err)
    }
  }

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    action: 'appointment_reminders',
    reminders24h: { found: upcoming24h.length, sent: reminders24hSent },
    reminders1h: { found: upcoming1h.length, sent: reminders1hSent },
  }))

  console.log(`[appointment-reminders] Done at ${new Date().toISOString()}`)
}

sendReminders()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[appointment-reminders] Fatal:', err)
    process.exit(1)
  })
