/**
 * PII redaction helpers for log lines.
 *
 * Pre-2026-05-12 the worker, cron-appointment-reminders, and several
 * webhook handlers logged `${patient.name} (${patient.phone})` directly.
 * PM2 logs land on disk + survive logrotate for 30 days, so a VPS disk
 * dump exposed months of patient phones in plaintext.
 *
 * Rules of thumb:
 *   - Phone: keep country code + last 2 digits ("+528441****67") so
 *     operators can correlate with WhatsApp Cloud API errors that echo
 *     the same suffix, but not enough to reverse-look-up.
 *   - Name: first letter + dots ("M****"). Enough to disambiguate two
 *     parallel jobs in logs.
 *   - Email: first 2 chars + domain.
 *   - Free-form text (clinical questions, message bodies): replace
 *     entirely with a length indicator.
 */

export function redactPhone(phone: string | null | undefined): string {
  if (!phone) return '<no-phone>'
  const trimmed = String(phone).trim()
  if (trimmed.length < 6) return '<short>'
  return trimmed.slice(0, Math.min(5, trimmed.length - 2)) + '****' + trimmed.slice(-2)
}

export function redactName(name: string | null | undefined): string {
  if (!name) return '<no-name>'
  const trimmed = String(name).trim()
  if (trimmed.length < 2) return '<short>'
  return trimmed.slice(0, 1) + '****'
}

export function redactEmail(email: string | null | undefined): string {
  if (!email) return '<no-email>'
  const trimmed = String(email).trim()
  const atIdx = trimmed.indexOf('@')
  if (atIdx < 2) return '<malformed>'
  return trimmed.slice(0, 2) + '****' + trimmed.slice(atIdx)
}

/** Redact a free-form text body — log only the length, not the content. */
export function redactBody(body: string | null | undefined): string {
  if (!body) return '<empty>'
  return `<${String(body).length}-chars>`
}

/**
 * Shallow-clone an object and redact common PII fields. Useful when
 * logging request payloads in error handlers — pass the raw object and
 * get a safe-to-log version.
 *
 * Recognizes: phone, patientPhone, name, patientName, email,
 * patientEmail, clientPhone, clientEmail, clientName, message, body,
 * content, text, prompt, response, accessToken, refreshToken,
 * password, secret, token, apiKey.
 */
export function sanitizeForLog<T extends Record<string, unknown>>(obj: T | null | undefined): Partial<T> | null {
  if (!obj || typeof obj !== 'object') return obj as Partial<T> | null
  const PHONE_KEYS = new Set(['phone', 'patientPhone', 'clientPhone', 'recipient', 'to', 'from'])
  const NAME_KEYS = new Set(['name', 'patientName', 'clientName', 'fullName'])
  const EMAIL_KEYS = new Set(['email', 'patientEmail', 'clientEmail'])
  const BODY_KEYS = new Set(['message', 'body', 'content', 'text', 'prompt', 'response', 'reply'])
  const SECRET_KEYS = new Set([
    'accessToken', 'refreshToken', 'password', 'secret', 'token',
    'apiKey', 'access_token', 'refresh_token', 'api_key', 'auth_token',
  ])
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v == null) { out[k] = v; continue }
    if (typeof v === 'string') {
      if (PHONE_KEYS.has(k)) out[k] = redactPhone(v)
      else if (NAME_KEYS.has(k)) out[k] = redactName(v)
      else if (EMAIL_KEYS.has(k)) out[k] = redactEmail(v)
      else if (BODY_KEYS.has(k)) out[k] = redactBody(v)
      else if (SECRET_KEYS.has(k)) out[k] = '<redacted>'
      else out[k] = v
    } else {
      out[k] = v
    }
  }
  return out as Partial<T>
}
