import { Resend } from 'resend'
import { trackPatientComm } from './patient-comms'

let resendClient: Resend | null = null

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {

    return null
  }
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY)
  }
  return resendClient
}

/**
 * Send a transactional email through Resend. Optionally records the send in
 * the per-patient communication ledger when a `tenantId + patientId` pair is
 * supplied — this is what powers the patient detail "Comunicaciones" tab.
 *
 * Tracking is fire-and-forget and never blocks the email.
 */
export async function sendEmail({
  to,
  subject,
  html,
  tenantId,
  patientId,
  createdBy,
}: {
  to: string
  subject: string
  html: string
  /** When provided alongside patientId, the email is logged to patient_communications. */
  tenantId?: string
  patientId?: string
  createdBy?: string
}): Promise<boolean> {
  const resend = getResend()
  if (!resend) return false

  const from = process.env.EMAIL_FROM ?? 'citas@auctorum.com.mx'

  try {
    const result = await resend.emails.send({ from, to, subject, html })

    if (tenantId && patientId) {
      const externalId =
        (result as any)?.data?.id ?? (result as any)?.id ?? null
      void trackPatientComm({
        tenantId,
        patientId,
        type: 'email_sent',
        subject,
        recipient: to,
        externalId,
        createdBy,
      })
    }

    return true
  } catch (error) {
    console.error('Email send error:', error)
    return false
  }
}

export function buildGoogleCalendarUrl({
  title,
  date,
  startTime,
  endTime,
  location,
  description,
}: {
  title: string
  date: string
  startTime: string
  endTime: string
  location: string
  description: string
}): string {
  // Format: YYYYMMDDTHHMMSS (local time)
  const start = `${date.replace(/-/g, '')}T${startTime.replace(/:/g, '').slice(0, 6)}`
  const end = `${date.replace(/-/g, '')}T${endTime.replace(/:/g, '').slice(0, 6)}`

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${start}/${end}`,
    location,
    details: description,
    ctz: 'America/Monterrey',
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
