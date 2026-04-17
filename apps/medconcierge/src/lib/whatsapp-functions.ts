import { and, eq, gte, notInArray, sql, asc } from "drizzle-orm"
import { db, appointments, patients, schedules, clients } from "@quote-engine/db"
import {
  isGoogleCalendarConfigured,
  createCalendarEvent,
  cancelCalendarEvent,
} from "./google-calendar"
import type { Tenant } from "@quote-engine/db"

// --------------- Types ---------------
export interface FunctionResult {
  name: string
  result: string
}

// --------------- Tool Definitions ---------------
export const WHATSAPP_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "check_availability",
      description: "Verificar disponibilidad de citas para una fecha especifica",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Fecha en formato YYYY-MM-DD" },
        },
        required: ["date"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "book_appointment",
      description: "Agendar una cita para un paciente",
      parameters: {
        type: "object",
        properties: {
          patient_name: { type: "string", description: "Nombre completo del paciente" },
          date: { type: "string", description: "Fecha YYYY-MM-DD" },
          time: { type: "string", description: "Hora HH:MM (24h)" },
          reason: { type: "string", description: "Motivo de la consulta" },
        },
        required: ["patient_name", "date", "time"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "cancel_appointment",
      description: "Cancelar una cita existente del paciente",
      parameters: {
        type: "object",
        properties: {
          appointment_id: { type: "string", description: "ID de la cita a cancelar" },
        },
        required: ["appointment_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_patient_appointments",
      description: "Obtener las citas programadas de un paciente",
      parameters: {
        type: "object",
        properties: {
          phone: { type: "string", description: "Numero de telefono del paciente" },
        },
        required: ["phone"],
      },
    },
  },
]

// --------------- Function Handlers ---------------

export async function handleCheckAvailability(
  tenantId: string,
  args: { date: string }
): Promise<string> {
  try {
    const requestedDate = args.date
    const dayOfWeek = new Date(requestedDate + "T12:00:00").getDay()

    // Get tenant schedules for that day
    const daySchedules = await db
      .select()
      .from(schedules)
      .where(
        and(
          eq(schedules.tenantId, tenantId),
          eq(schedules.dayOfWeek, dayOfWeek),
          eq(schedules.isActive, true)
        )
      )

    if (daySchedules.length === 0) {
      return JSON.stringify({ available: false, slots: [], message: "No hay horario configurado para ese dia" })
    }

    // Get existing appointments
    const existing = await db
      .select({ startTime: appointments.startTime })
      .from(appointments)
      .where(
        and(
          eq(appointments.tenantId, tenantId),
          eq(appointments.date, requestedDate),
          notInArray(appointments.status, ["cancelled"])
        )
      )

    const bookedTimes = new Set(existing.map(a => a.startTime.slice(0, 5)))

    // Generate available slots
    const slots: string[] = []
    for (const sched of daySchedules) {
      const duration = sched.slotDurationMin || 30
      const [startH, startM] = sched.startTime.split(":").map(Number)
      const [endH, endM] = sched.endTime.split(":").map(Number)
      let currentMin = startH * 60 + startM
      const endMin = endH * 60 + endM

      while (currentMin + duration <= endMin) {
        const timeStr = `${String(Math.floor(currentMin / 60)).padStart(2, "0")}:${String(currentMin % 60).padStart(2, "0")}`
        if (!bookedTimes.has(timeStr)) {
          slots.push(timeStr)
        }
        currentMin += duration
      }
    }

    return JSON.stringify({
      available: slots.length > 0,
      slots,
      date: requestedDate,
      message: slots.length > 0
        ? `Hay ${slots.length} horarios disponibles`
        : "No hay horarios disponibles para ese dia",
    })
  } catch (error) {
    console.error("[check_availability] error:", error)
    return JSON.stringify({ available: false, slots: [], message: "Error verificando disponibilidad" })
  }
}

export async function handleBookAppointment(
  tenantId: string,
  phone: string,
  tenant: Tenant,
  args: { patient_name: string; date: string; time: string; reason?: string }
): Promise<string> {
  try {
    const normalizedPhone = phone.replace(/\D/g, "")

    // Find or create patient
    let [patient] = await db
      .select()
      .from(patients)
      .where(
        and(
          eq(patients.tenantId, tenantId),
          sql`REGEXP_REPLACE(${patients.phone}, '[^0-9]', '', 'g') LIKE ${"%" + normalizedPhone.replace(/^52/, "")}`,
        )
      )
      .limit(1)

    if (!patient) {
      const [created] = await db
        .insert(patients)
        .values({
          tenantId,
          name: args.patient_name,
          phone,

        })
        .returning()
      patient = created
    } else if (patient.name.startsWith("WhatsApp ")) {
      // Update name
      await db
        .update(patients)
        .set({ name: args.patient_name })
        .where(eq(patients.id, patient.id))
    }

    // Also update client name if exists
    const normalizedShort = normalizedPhone.replace(/^52/, "")
    await db
      .update(clients)
      .set({ name: args.patient_name })
      .where(
        and(
          eq(clients.tenantId, tenantId),
          sql`REGEXP_REPLACE(${clients.phone}, '[^0-9]', '', 'g') LIKE ${"%" + normalizedShort}`,
          sql`${clients.name} LIKE 'WhatsApp %'`,
        )
      )
      .catch(() => {})

    // Calculate end time (30 min slots)
    const [h, m] = args.time.split(":").map(Number)
    const endMin = h * 60 + m + 30
    const endTime = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}:00`
    const startTime = `${args.time}:00`

    // Check slot is still available
    const [existing] = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.tenantId, tenantId),
          eq(appointments.date, args.date),
          eq(appointments.startTime, startTime),
          notInArray(appointments.status, ["cancelled"])
        )
      )
      .limit(1)

    if (existing) {
      return JSON.stringify({ success: false, message: "Ese horario ya no esta disponible" })
    }

    // Create appointment
    const [appt] = await db
      .insert(appointments)
      .values({
        tenantId,
        patientId: patient.id,
        date: args.date,
        startTime,
        endTime,
        status: "confirmed",
        reason: args.reason || "Consulta general",
        confirmedByPatient: true,
        confirmedAt: new Date(),
      })
      .returning()

    // Sync to Google Calendar
    const tenantConfig = (tenant.config as Record<string, any>) || {}
    if (isGoogleCalendarConfigured(tenantConfig)) {
      try {
        const eventId = await createCalendarEvent(
          {
            summary: `Cita - ${args.patient_name}`,
            description: args.reason || "Consulta general",
            startDateTime: `${args.date}T${startTime}`,
            endDateTime: `${args.date}T${endTime}`,
            reminderMinutes: 60,
          },
          tenantConfig
        )
        if (eventId) {
          await db.execute(
            sql`UPDATE appointments SET google_event_id = ${eventId} WHERE id = ${appt.id}`
          )
        }
      } catch (e) {
        console.error("[book_appointment] gcal error:", e)
      }
    }

    const dateDisplay = new Date(args.date + "T12:00:00").toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })

    return JSON.stringify({
      success: true,
      appointment_id: appt.id,
      date: dateDisplay,
      time: args.time,
      patient_name: args.patient_name,
      message: `Cita agendada exitosamente para ${dateDisplay} a las ${args.time}`,
    })
  } catch (error) {
    console.error("[book_appointment] error:", error)
    return JSON.stringify({ success: false, message: "Error al agendar la cita" })
  }
}

export async function handleCancelAppointment(
  tenantId: string,
  tenant: Tenant,
  args: { appointment_id: string }
): Promise<string> {
  try {
    const [appt] = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.id, args.appointment_id),
          eq(appointments.tenantId, tenantId)
        )
      )
      .limit(1)

    if (!appt) {
      return JSON.stringify({ success: false, message: "Cita no encontrada" })
    }

    await db
      .update(appointments)
      .set({ status: "cancelled", cancelledAt: new Date() })
      .where(eq(appointments.id, args.appointment_id))

    // Cancel in Google Calendar
    const tenantConfig = (tenant.config as Record<string, any>) || {}
    if (appt.googleEventId && isGoogleCalendarConfigured(tenantConfig)) {
      cancelCalendarEvent(appt.googleEventId, tenantConfig).catch(e =>
        console.error("[cancel_appointment] gcal error:", e)
      )
    }

    return JSON.stringify({ success: true, message: "Cita cancelada exitosamente" })
  } catch (error) {
    console.error("[cancel_appointment] error:", error)
    return JSON.stringify({ success: false, message: "Error al cancelar la cita" })
  }
}

export async function handleGetPatientAppointments(
  tenantId: string,
  args: { phone: string }
): Promise<string> {
  try {
    const normalized = args.phone.replace(/\D/g, "").replace(/^52/, "")
    const today = new Date().toISOString().split("T")[0]

    const results = await db
      .select({
        id: appointments.id,
        date: appointments.date,
        startTime: appointments.startTime,
        status: appointments.status,
        reason: appointments.reason,
      })
      .from(appointments)
      .innerJoin(patients, eq(patients.id, appointments.patientId))
      .where(
        and(
          eq(appointments.tenantId, tenantId),
          sql`REGEXP_REPLACE(${patients.phone}, '[^0-9]', '', 'g') LIKE ${"%" + normalized}`,
          gte(appointments.date, today),
          notInArray(appointments.status, ["cancelled"])
        )
      )
      .orderBy(asc(appointments.date), asc(appointments.startTime))
      .limit(10)

    const formatted = results.map(a => ({
      id: a.id,
      date: new Date(a.date + "T12:00:00").toLocaleDateString("es-MX", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
      time: a.startTime.slice(0, 5),
      status: a.status,
      reason: a.reason || "Consulta general",
    }))

    return JSON.stringify({
      appointments: formatted,
      count: formatted.length,
      message: formatted.length > 0
        ? `Tiene ${formatted.length} cita(s) programada(s)`
        : "No tiene citas programadas",
    })
  } catch (error) {
    console.error("[get_patient_appointments] error:", error)
    return JSON.stringify({ appointments: [], count: 0, message: "Error consultando citas" })
  }
}

// --------------- Dispatch function calls ---------------
export async function dispatchFunctionCall(
  name: string,
  args: any,
  tenantId: string,
  phone: string,
  tenant: Tenant
): Promise<string> {
  switch (name) {
    case "check_availability":
      return handleCheckAvailability(tenantId, args)
    case "book_appointment":
      return handleBookAppointment(tenantId, phone, tenant, args)
    case "cancel_appointment":
      return handleCancelAppointment(tenantId, tenant, args)
    case "get_patient_appointments":
      return handleGetPatientAppointments(tenantId, { phone: args.phone || phone })
    default:
      return JSON.stringify({ error: "Funcion no reconocida" })
  }
}
