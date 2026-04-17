/**
 * Smart Reminders Cron — Runs every hour via PM2
 * Sends 24h WhatsApp reminders for confirmed appointments.
 * Also creates doctor notifications for new events.
 */

import { eq, and, gte, lte, sql, isNull } from "drizzle-orm"
import { db, tenants, appointments, patients, notifications } from "@quote-engine/db"

const WHATSAPP_API_URL = "https://graph.facebook.com/v19.0"

async function sendWhatsApp(to: string, body: string): Promise<boolean> {
  const token = process.env.WHATSAPP_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  if (!token || !phoneNumberId) return false

  const normalizedPhone = to.replace(/\D/g, "")
  const phone = normalizedPhone.startsWith("52") ? normalizedPhone : `52${normalizedPhone}`

  try {
    const res = await fetch(`${WHATSAPP_API_URL}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: { body },
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

async function main() {
  console.log("[smart-reminders] Starting...")

  const now = new Date()
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const tomorrow = in24h.toISOString().split("T")[0]
  const today = now.toISOString().split("T")[0]

  // Find appointments in next 24h that haven't been reminded
  const upcomingAppointments = await db
    .select({
      appt: appointments,
      patient: patients,
      tenantId: appointments.tenantId,
    })
    .from(appointments)
    .innerJoin(patients, eq(patients.id, appointments.patientId))
    .where(
      and(
        sql`${appointments.status} IN ('scheduled', 'confirmed')`,
        sql`${appointments.date} IN (${today}, ${tomorrow})`,
        eq(appointments.reminder24hSent, false)
      )
    )

  console.log(`[smart-reminders] Found ${upcomingAppointments.length} appointments to remind`)

  for (const { appt, patient, tenantId } of upcomingAppointments) {
    // Get tenant info
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1)

    if (!tenant) continue

    const displayDate = new Date(appt.date + "T12:00:00").toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
    const displayTime = appt.startTime.slice(0, 5)

    const message = `Recordatorio: Su cita con ${tenant.name} es ${
      appt.date === today ? "hoy" : "manana"
    } ${displayDate} a las ${displayTime}. Responda CONFIRMO para confirmar o CANCELO para cancelar.`

    const sent = await sendWhatsApp(patient.phone, message)
    console.log(`[smart-reminders] ${sent ? "Sent" : "Failed"} reminder to ${patient.phone} for ${appt.date} ${displayTime}`)

    // Mark as sent regardless (to avoid spam on retry)
    await db
      .update(appointments)
      .set({
        reminder24hSent: true,
        reminder24hSentAt: new Date(),
      })
      .where(eq(appointments.id, appt.id))

    // Create notification for doctor
    await db
      .insert(notifications)
      .values({
        tenantId,
        type: "reminder_sent",
        title: "Recordatorio enviado",
        message: `Recordatorio enviado a ${patient.name} para cita ${displayDate} ${displayTime}`,
      })
      .catch(() => {})
  }

  console.log("[smart-reminders] Complete")
  process.exit(0)
}

main().catch(e => {
  console.error("[smart-reminders] Fatal error:", e)
  process.exit(1)
})
