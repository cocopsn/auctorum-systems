import { db, notifications } from "@quote-engine/db"
import { sendWhatsAppMessage } from "./whatsapp"

type NotificationType = "rescheduled" | "cancelled" | "reminder" | "confirmed" | "new_appointment" | "cancelled_appointment" | "confirmed_appointment" | "new_message"

interface AppointmentNotificationData {
  patientName: string
  date: string
  time: string
  doctorName?: string
}

const TEMPLATES: Record<string, (data: AppointmentNotificationData) => string> = {
  rescheduled: (d) => `Su cita ha sido reprogramada para ${d.date} a las ${d.time}. Si tiene alguna duda, responda a este mensaje.`,
  cancelled: (d) => `Su cita del ${d.date} ha sido cancelada. Para reagendar, responda a este mensaje.`,
  reminder: (d) => `Recordatorio: Su cita con ${d.doctorName || "el doctor"} es ${d.date} a las ${d.time}. Responda CONFIRMO para confirmar o CANCELO para cancelar.`,
  confirmed: (d) => `Su cita para ${d.date} a las ${d.time} ha sido confirmada. Le esperamos.`,
}

export async function sendAppointmentNotification(
  patientPhone: string,
  type: NotificationType,
  data: AppointmentNotificationData
): Promise<void> {
  try {
    const template = TEMPLATES[type]
    if (!template) {
      console.warn(`[notification] Unknown type: ${type}`)
      return
    }
    const message = template(data)
    const sent = await sendWhatsAppMessage(patientPhone, message)
    if (!sent) {
      console.warn(`[notification] Failed to send ${type} to ${patientPhone}`)
    }
  } catch (error) {
    console.error(`[notification] Error sending ${type}:`, error)
    // Non-blocking: log but don't throw
  }
}

export async function createDoctorNotification(
  tenantId: string,
  type: string,
  title: string,
  message: string
): Promise<void> {
  try {
    await db.insert(notifications).values({
      tenantId,
      type,
      title,
      message,
    })
  } catch (error) {
    console.error("[notification] Failed to create doctor notification:", error)
  }
}
