export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db, appointments, patients, appointmentEvents } from "@quote-engine/db"
import { getAuthTenant } from "@/lib/auth"
import { cancelCalendarEvent, isGoogleCalendarConfigured } from "@/lib/google-calendar"
import { calendarWithFallback } from "@quote-engine/ai"
import { sendWhatsAppMessage } from "@/lib/whatsapp"
import { validateOrigin } from '@/lib/csrf'
import { formatBotMessage } from '@/lib/bot-messages'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!validateOrigin(req)) return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });

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
      // Cancel on Google Calendar; on failure (network, 5xx, expired token)
      // queue in pending_calendar_ops for the cron to retry. The local
      // cancellation already succeeded — Google is a mirror.
      void calendarWithFallback({
        tenantId: auth.tenant.id,
        appointmentId: current.appt.id,
        operation: 'delete',
        data: { googleEventId: current.appt.googleEventId },
        call: () => cancelCalendarEvent(current.appt.googleEventId!, tenantConfig),
      }).then((r) => {
        if (!r.ok) console.warn(`[cancel] gcal queued for retry: ${r.queuedId}`)
      })
    }

    const displayDate = new Date(current.appt.date + "T12:00:00").toLocaleDateString("es-MX", {
      weekday: "long", day: "numeric", month: "long",
    })
    // Use the doctor's customizable cancellation message from /settings/messages
    // (tenant.config.bot_messages.appointment_cancelled). Falls back to the
    // default copy in DEFAULT_BOT_MESSAGES if the doctor never customized.
    const message = formatBotMessage(auth.tenant, 'appointment_cancelled', {
      nombre: current.patient.name,
      fecha: displayDate,
    })
    sendWhatsAppMessage(current.patient.phone, message).catch((e) =>
      console.error("[cancel] whatsapp error:", e),
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Appointment cancel error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
