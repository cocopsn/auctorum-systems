export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db, appointments, patients, appointmentEvents } from "@quote-engine/db"
import { getAuthTenant } from "@/lib/auth"
import { cancelCalendarEvent, isGoogleCalendarConfigured } from "@/lib/google-calendar"
import { sendWhatsAppMessage } from "@/lib/whatsapp"

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const tenantId = auth.tenant.id

    const [current] = await db
      .select({ appt: appointments, patient: patients })
      .from(appointments)
      .innerJoin(patients, eq(patients.id, appointments.patientId))
      .where(and(eq(appointments.id, params.id), eq(appointments.tenantId, tenantId)))
      .limit(1)

    if (!current) return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 })

    await db
      .update(appointments)
      .set({ status: "cancelled", cancelledAt: new Date() })
      .where(eq(appointments.id, params.id))

    await db.insert(appointmentEvents).values({
      appointmentId: params.id,
      tenantId,
      eventType: "cancelled",
      metadata: { source: "dashboard" },
    })

    const tenantConfig = auth.tenant.config as Record<string, any>
    if (current.appt.googleEventId && isGoogleCalendarConfigured(tenantConfig)) {
      cancelCalendarEvent(current.appt.googleEventId, tenantConfig).catch(e =>
        console.error("[cancel] gcal error:", e)
      )
    }

    const displayDate = new Date(current.appt.date + "T12:00:00").toLocaleDateString("es-MX", {
      weekday: "long", day: "numeric", month: "long",
    })
    sendWhatsAppMessage(
      current.patient.phone,
      `Su cita del ${displayDate} ha sido cancelada. Para reagendar, responda a este mensaje.`
    ).catch(e => console.error("[cancel] whatsapp error:", e))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Appointment cancel error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
