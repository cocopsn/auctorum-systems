/**
 * Cron: Send 24h and 2h reminders for upcoming medical appointments
 * Run: npx tsx scripts/cron-appointment-reminders.ts
 * Schedule: every 30 minutes via PM2 or crontab
 */

import 'dotenv/config'
import { db, appointments, patients, tenants, doctors } from '@quote-engine/db'
import type { TenantConfig } from '@quote-engine/db'
import { eq, and, sql } from 'drizzle-orm'
import { sendWhatsAppMessage } from '@quote-engine/notifications/whatsapp'

async function sendReminders() {
  const now = new Date()
  console.log(`[appointment-reminders] Starting at ${now.toISOString()}`)

  // ============================================================
  // 24-hour reminders
  // Find appointments 24–25 hours from now that haven't had 24h reminder
  // ============================================================
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
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
        eq(appointments.status, 'scheduled'),
        eq(appointments.reminder24hSent, false),
        sql`(${appointments.date}::date + ${appointments.startTime}::time) BETWEEN ${in24h.toISOString()}::timestamp AND ${in25h.toISOString()}::timestamp`
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

      // Send WhatsApp reminder to patient
      if (patient.phone) {
        await sendWhatsAppMessage({
          to: patient.phone,
          message: [
            `*Recordatorio de cita*`,
            ``,
            `Hola ${patient.name}, le recordamos su cita manana ${displayDate} a las ${displayTime} con ${tenant.name}.`,
            ``,
            `Direccion: ${config.contact?.address || 'Consultar con el consultorio'}`,
            ``,
            `Responda CONFIRMO para confirmar o CANCELO para cancelar.`,
          ].join('\n'),
        })
      }

      // Mark as sent
      await db
        .update(appointments)
        .set({ reminder24hSent: true, reminder24hSentAt: new Date() })
        .where(eq(appointments.id, appointment.id))

      reminders24hSent++
      console.log(`[appointment-reminders] 24h reminder sent to ${patient.name} (${patient.phone})`)
    } catch (err) {
      console.error(`[appointment-reminders] Error sending 24h reminder for appointment ${appointment.id}:`, err)
    }
  }

  // ============================================================
  // 2-hour reminders
  // Find appointments 2–2.5 hours from now that haven't had 2h reminder
  // ============================================================
  const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000)
  const in2h30m = new Date(now.getTime() + 2.5 * 60 * 60 * 1000)

  const upcoming2h = await db
    .select({
      appointment: appointments,
      patient: patients,
    })
    .from(appointments)
    .innerJoin(patients, eq(patients.id, appointments.patientId))
    .where(
      and(
        eq(appointments.status, 'scheduled'),
        eq(appointments.reminder2hSent, false),
        sql`(${appointments.date}::date + ${appointments.startTime}::time) BETWEEN ${in2h.toISOString()}::timestamp AND ${in2h30m.toISOString()}::timestamp`
      )
    )

  console.log(`[appointment-reminders] Found ${upcoming2h.length} appointments needing 2h reminder`)

  let reminders2hSent = 0

  for (const { appointment, patient } of upcoming2h) {
    try {
      const [tenant] = await db.select().from(tenants).where(eq(tenants.id, appointment.tenantId)).limit(1)
      if (!tenant) continue

      const config = tenant.config as TenantConfig
      if (!config.notifications?.whatsapp_reminder_2h) continue

      const displayTime = appointment.startTime.slice(0, 5)

      if (patient.phone) {
        await sendWhatsAppMessage({
          to: patient.phone,
          message: [
            `*Recordatorio: su cita es en 2 horas*`,
            ``,
            `${patient.name}, su cita con ${tenant.name} es hoy a las ${displayTime}.`,
            ``,
            `Direccion: ${config.contact?.address || 'Consultar con el consultorio'}`,
          ].join('\n'),
        })
      }

      await db
        .update(appointments)
        .set({ reminder2hSent: true, reminder2hSentAt: new Date() })
        .where(eq(appointments.id, appointment.id))

      reminders2hSent++
      console.log(`[appointment-reminders] 2h reminder sent to ${patient.name} (${patient.phone})`)
    } catch (err) {
      console.error(`[appointment-reminders] Error sending 2h reminder for appointment ${appointment.id}:`, err)
    }
  }

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    action: 'appointment_reminders',
    reminders24h: { found: upcoming24h.length, sent: reminders24hSent },
    reminders2h: { found: upcoming2h.length, sent: reminders2hSent },
  }))

  console.log(`[appointment-reminders] Done at ${new Date().toISOString()}`)
}

sendReminders()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[appointment-reminders] Fatal:', err)
    process.exit(1)
  })
