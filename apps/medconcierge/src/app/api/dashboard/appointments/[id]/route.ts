export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db, appointments, patients, appointmentEvents } from "@quote-engine/db"
import { getAuthTenant } from "@/lib/auth"
import { updateCalendarEvent, isGoogleCalendarConfigured } from "@/lib/google-calendar"
import { calendarWithFallback } from "@quote-engine/ai"
import { sendWhatsAppMessage } from "@/lib/whatsapp"
import { formatBotMessage } from "@/lib/bot-messages"
import { z } from "zod"
import { validateOrigin } from '@/lib/csrf'

const updateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}/).optional(),
  status: z.enum(["scheduled", "confirmed", "completed", "cancelled", "no_show"]).optional(),
  reason: z.string().max(500).optional(),
  notes: z.string().optional(),
})

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!validateOrigin(req)) return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });

  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const tenantId = auth.tenant.id
    const data = parsed.data

    const [current] = await db
      .select({ appt: appointments, patient: patients })
      .from(appointments)
      .innerJoin(patients, eq(patients.id, appointments.patientId))
      .where(and(eq(appointments.id, params.id), eq(appointments.tenantId, tenantId)))
      .limit(1)

    if (!current) return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 })

    const oldDate = current.appt.date
    const oldTime = current.appt.startTime

    const updateData: Record<string, any> = {}
    if (data.date) updateData.date = data.date
    if (data.startTime) updateData.startTime = data.startTime
    if (data.endTime) updateData.endTime = data.endTime
    if (data.status) updateData.status = data.status
    if (data.reason !== undefined) updateData.reason = data.reason
    if (data.notes !== undefined) updateData.notes = data.notes

    const [updated] = await db
      .update(appointments)
      .set(updateData)
      .where(and(eq(appointments.id, params.id), eq(appointments.tenantId, tenantId)))
      .returning()

    await db.insert(appointmentEvents).values({
      appointmentId: params.id,
      tenantId,
      eventType: "updated",
      metadata: { source: "dashboard", changes: data },
    })

    const tenantConfig = auth.tenant.config as Record<string, any>
    if (current.appt.googleEventId && isGoogleCalendarConfigured(tenantConfig)) {
      const gcalUpdates: Record<string, any> = {}
      if (data.date || data.startTime) {
        gcalUpdates.startDateTime = `${data.date || current.appt.date}T${data.startTime || current.appt.startTime}`
        gcalUpdates.endDateTime = `${data.date || current.appt.date}T${data.endTime || current.appt.endTime}`
      }
      if (data.reason) gcalUpdates.description = data.reason
      // Update on Google Calendar; on failure queue in pending_calendar_ops
      // so the cron can retry once Google is reachable again.
      void calendarWithFallback({
        tenantId: auth.tenant.id,
        appointmentId: current.appt.id,
        operation: 'update',
        data: { googleEventId: current.appt.googleEventId, ...gcalUpdates },
        call: () => updateCalendarEvent(current.appt.googleEventId!, gcalUpdates, tenantConfig),
      }).then((r) => {
        if (!r.ok) console.warn(`[appt update] gcal queued for retry: ${r.queuedId}`)
      })
    }

    if (data.date || data.startTime) {
      const newDate = new Date((data.date || oldDate) + "T12:00:00").toLocaleDateString("es-MX", {
        weekday: "long", day: "numeric", month: "long",
      })
      const newTime = (data.startTime || oldTime).slice(0, 5)
      const message = formatBotMessage(auth.tenant, 'appointment_rescheduled', {
        nombre: current.patient.name,
        fecha: newDate,
        hora: newTime,
      })
      sendWhatsAppMessage(current.patient.phone, message).catch((e) =>
        console.error("[appt update] whatsapp error:", e),
      )
    }

    return NextResponse.json({ appointment: updated })
  } catch (error) {
    console.error("Appointment PUT error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
