export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db, appointments, patients, appointmentEvents } from "@quote-engine/db"
import { getAuthTenant } from "@/lib/auth"
import { updateCalendarEvent, isGoogleCalendarConfigured } from "@/lib/google-calendar"
import { sendWhatsAppMessage } from "@/lib/whatsapp"
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

export async function PUT(req: NextRequest, {
  if (!validateOrigin(request)) return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
 params }: { params: { id: string } }) {
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
      updateCalendarEvent(current.appt.googleEventId, gcalUpdates, tenantConfig).catch(e =>
        console.error("[appt update] gcal sync error:", e)
      )
    }

    if (data.date || data.startTime) {
      const newDate = new Date((data.date || oldDate) + "T12:00:00").toLocaleDateString("es-MX", {
        weekday: "long", day: "numeric", month: "long",
      })
      const newTime = (data.startTime || oldTime).slice(0, 5)
      sendWhatsAppMessage(
        current.patient.phone,
        `Su cita ha sido reprogramada para ${newDate} a las ${newTime}. Si tiene alguna duda, responda a este mensaje.`
      ).catch(e => console.error("[appt update] whatsapp error:", e))
    }

    return NextResponse.json({ appointment: updated })
  } catch (error) {
    console.error("Appointment PUT error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
