import { Resend } from 'resend'

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

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}): Promise<boolean> {
  const resend = getResend()
  if (!resend) return false

  const from = process.env.EMAIL_FROM ?? 'citas@auctorum.com.mx'

  try {
    await resend.emails.send({ from, to, subject, html })

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
