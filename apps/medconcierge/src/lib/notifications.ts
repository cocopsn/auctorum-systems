import { eq } from 'drizzle-orm'
import { db, tenants, doctors } from '@quote-engine/db'
import type { Appointment, Patient, TenantConfig } from '@quote-engine/db'
import { sendWhatsAppMessage } from './whatsapp'
import { sendEmail, buildGoogleCalendarUrl } from './email'
import { buildPortalUrl } from './portal'

export async function notifyNewAppointment(
  appointment: Appointment,
  patient: Patient,
  tenantId: string
) {
  // Fetch tenant and doctor data
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1)
  if (!tenant) return

  const [doctor] = await db.select().from(doctors).where(eq(doctors.tenantId, tenantId)).limit(1)
  if (!doctor) return

  const config = tenant.config as TenantConfig

  const displayDate = new Date(appointment.date + 'T12:00:00').toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const displayTime = appointment.startTime.slice(0, 5)

  const portalUrl = buildPortalUrl(tenant.slug, patient.portalToken)

  // WhatsApp to patient
  if (config.notifications?.whatsapp_on_new_appointment) {
    const patientMsg = [
      `Su cita con ${tenant.name} está confirmada para ${displayDate} a las ${displayTime}.`,
      `Dirección: ${config.contact.address}`,
      '',
      `Ver sus citas y recetas: ${portalUrl}`,
      '',
      'Responda CONFIRMO para confirmar o CANCELO para cancelar.',
    ].join('\n')

    await sendWhatsAppMessage(patient.phone, patientMsg)
  }

  // WhatsApp to doctor
  if (config.notifications?.whatsapp_on_new_appointment) {
    const doctorMsg = [
      `Nueva cita: ${patient.name}`,
      `Fecha: ${displayDate} ${displayTime}`,
      `Motivo: ${appointment.reason ?? 'No especificado'}`,
      patient.insuranceProvider ? `Seguro: ${patient.insuranceProvider}` : 'Sin seguro',
      `Tel: ${patient.phone}`,
    ].join('\n')

    await sendWhatsAppMessage(config.contact.whatsapp, doctorMsg)
  }

  // Email to patient
  if (config.notifications?.email_on_new_appointment && patient.email) {
    const calendarUrl = buildGoogleCalendarUrl({
      title: `Cita con ${tenant.name}`,
      date: appointment.date,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      location: config.contact.address,
      description: `Consulta de ${config.medical!.specialty} con ${tenant.name}`,
    })

    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${config.colors.primary}; padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">Cita Confirmada</h1>
        </div>
        <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
          <p>Hola <strong>${patient.name}</strong>,</p>
          <p>Su cita ha sido agendada exitosamente:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Doctor</td>
              <td style="padding: 8px 0; font-weight: 600;">${tenant.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Especialidad</td>
              <td style="padding: 8px 0;">${config.medical!.specialty}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Fecha</td>
              <td style="padding: 8px 0; font-weight: 600;">${displayDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Hora</td>
              <td style="padding: 8px 0; font-weight: 600;">${displayTime}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Dirección</td>
              <td style="padding: 8px 0;">${config.contact.address}</td>
            </tr>
          </table>
          <a href="${calendarUrl}" style="display: inline-block; background: ${config.colors.primary}; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
            Agregar a Google Calendar
          </a>
          <a href="${portalUrl}" style="display: inline-block; background: #374151; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; margin-left: 8px;">
            Ver Mi Portal
          </a>
          <p style="margin-top: 12px; color: #6b7280; font-size: 13px;">
            En su portal puede ver sus citas, recetas y documentos médicos.
          </p>
          <p style="margin-top: 16px; color: #9ca3af; font-size: 14px;">
            Si necesita cancelar o reagendar, comuníquese por WhatsApp al ${config.contact.phone}.
          </p>
        </div>
      </div>
    `

    await sendEmail({
      to: patient.email,
      subject: `Cita confirmada — ${tenant.name} — ${displayDate} ${displayTime}`,
      html,
    })
  }
}

export async function notifyAppointmentCancelled(
  appointment: Appointment,
  patient: Patient,
  tenantId: string,
  reason?: string,
) {
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1)
  if (!tenant) return
  const config = tenant.config as TenantConfig

  const displayDate = new Date(appointment.date + 'T12:00:00').toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const displayTime = appointment.startTime.slice(0, 5)

  const patientMsg = [
    `*Cita cancelada*`,
    ``,
    `Hola ${patient.name}, su cita con ${tenant.name} del ${displayDate} a las ${displayTime} ha sido cancelada.`,
    reason ? `\nMotivo: ${reason}` : '',
    ``,
    `Para reagendar, comuníquese al ${config.contact?.phone ?? config.contact?.whatsapp ?? 'consultorio'}.`,
  ]
    .filter(Boolean)
    .join('\n')

  await sendWhatsAppMessage(patient.phone, patientMsg)

  if (config.contact?.whatsapp) {
    const doctorMsg = [
      `Cita CANCELADA`,
      `Paciente: ${patient.name}`,
      `Fecha: ${displayDate} ${displayTime}`,
      reason ? `Motivo: ${reason}` : '',
    ]
      .filter(Boolean)
      .join('\n')
    await sendWhatsAppMessage(config.contact.whatsapp, doctorMsg)
  }
}

export async function notifyAppointmentRescheduled(
  appointment: Appointment,
  patient: Patient,
  tenantId: string,
  oldDate: string,
  oldStartTime: string,
) {
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1)
  if (!tenant) return
  const config = tenant.config as TenantConfig

  const newDateDisplay = new Date(appointment.date + 'T12:00:00').toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const newTimeDisplay = appointment.startTime.slice(0, 5)
  const oldDateDisplay = new Date(oldDate + 'T12:00:00').toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const oldTimeDisplay = oldStartTime.slice(0, 5)

  const patientMsg = [
    `*Cita reagendada*`,
    ``,
    `Hola ${patient.name}, su cita con ${tenant.name} ha sido reagendada.`,
    ``,
    `Antes: ${oldDateDisplay} ${oldTimeDisplay}`,
    `Ahora: ${newDateDisplay} ${newTimeDisplay}`,
    ``,
    `Direccion: ${config.contact?.address ?? 'Consultar con el consultorio'}`,
    ``,
    `Responda CONFIRMO para confirmar o CANCELO para cancelar.`,
  ].join('\n')

  await sendWhatsAppMessage(patient.phone, patientMsg)
}
