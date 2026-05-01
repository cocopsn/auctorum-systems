export const dynamic = "force-dynamic"

import { NextRequest } from "next/server"
import { eq } from "drizzle-orm"
import { db, appointments, patients, tenants } from "@quote-engine/db"
import type { TenantConfig } from "@quote-engine/db"
import { createHmac, timingSafeEqual } from "crypto"

function getIcalSecret(): string {
  const secret = process.env.ICAL_SECRET || process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error("ICAL_SECRET or NEXTAUTH_SECRET must be set")
  }
  return secret
}

function verifyIcalToken(appointmentId: string, token: string): boolean {
  const expected = createHmac("sha256", getIcalSecret()).update(appointmentId).digest("hex").slice(0, 16)
  if (expected.length !== token.length) return false
  return timingSafeEqual(Buffer.from(expected), Buffer.from(token))
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    try {
      getIcalSecret()
    } catch {
      console.error("iCal secret not configured")
      return new Response("Server configuration error", { status: 500 })
    }

    const token = req.nextUrl.searchParams.get("token")
    if (!token) {
      return new Response("Missing token", { status: 400 })
    }

    if (!verifyIcalToken(params.id, token)) {
      return new Response("Invalid token", { status: 403 })
    }

    const [result] = await db
      .select({
        appt: appointments,
        patient: patients,
        tenant: tenants,
      })
      .from(appointments)
      .innerJoin(patients, eq(appointments.patientId, patients.id))
      .innerJoin(tenants, eq(appointments.tenantId, tenants.id))
      .where(eq(appointments.id, params.id))
      .limit(1)

    if (!result) {
      return new Response("Appointment not found", { status: 404 })
    }

    const { appt, tenant } = result
    const config = tenant.config as TenantConfig

    const formatIcsDateTime = (date: string, time: string) => {
      const d = date.replace(/-/g, "")
      const t = time.replace(/:/g, "").slice(0, 6)
      return `${d}T${t}`
    }

    const dtStart = formatIcsDateTime(appt.date, appt.startTime)
    const dtEnd = formatIcsDateTime(appt.date, appt.endTime)
    const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
    const location = config.contact?.address || "Consultorio"
    const specialty = config.medical?.specialty || ""

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Auctorum Systems//MedConcierge//ES",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `DTSTART;TZID=America/Monterrey:${dtStart}`,
      `DTEND;TZID=America/Monterrey:${dtEnd}`,
      `DTSTAMP:${now}`,
      `UID:${appt.id}@auctorum.com.mx`,
      `SUMMARY:Cita con ${tenant.name} - ${specialty}`,
      `LOCATION:${location}`,
      `DESCRIPTION:${appt.reason || "Consulta medica"}\nTel: ${config.contact?.phone || ""}`,
      "STATUS:CONFIRMED",
      "BEGIN:VALARM",
      "TRIGGER:-PT60M",
      "ACTION:DISPLAY",
      "DESCRIPTION:Recordatorio de cita en 1 hora",
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n")

    return new Response(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="cita-${tenant.slug}.ics"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("iCal generation error:", error)
    return new Response("Internal error", { status: 500 })
  }
}
