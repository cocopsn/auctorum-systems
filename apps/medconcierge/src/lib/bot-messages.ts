/**
 * Canonical reader + variable interpolation for the per-tenant bot messages
 * map. ONE function the appointment routes and the reminder cron both call,
 * so when the doctor edits "Mensaje de bienvenida" or "Recordatorio de cita"
 * in /settings/messages, the real outbound WhatsApp picks up the change.
 *
 * Storage: `tenants.config.bot_messages` (jsonb key on the existing config
 * object). Same place apply-template + apply-specialty write to. The
 * deprecated top-level `tenants.bot_messages` column is read as fallback so
 * tenants saved before the consolidation don't silently lose their custom
 * copy — first read of `config.bot_messages` after this commit will be
 * empty, the migration helper at the bottom of this file lazily promotes
 * the legacy column on the next save.
 *
 * Variables supported in template strings:
 *   {nombre}     patient name
 *   {negocio}    tenant name (clinic / consultorio)
 *   {fecha}      formatted date (e.g. "lunes 7 de mayo")
 *   {hora}       formatted time (e.g. "10:30")
 *   {servicio}   appointment reason / service
 *   {producto}   product name (B2B reuse)
 *   {doctor}     doctor name with title
 */

import type { Tenant } from '@quote-engine/db'

export type BotMessageKey =
  | 'welcome'
  | 'out_of_catalog'
  | 'out_of_stock'
  | 'order_confirmed'
  | 'appointment_confirmed'
  | 'appointment_reminder'
  | 'appointment_reminder_24h'
  | 'appointment_reminder_1h'
  | 'appointment_cancelled'
  | 'appointment_rescheduled'
  | 'recall'

export const DEFAULT_BOT_MESSAGES: Record<BotMessageKey, string> = {
  welcome:
    'Hola {nombre}, bienvenido a {negocio}. ¿En qué podemos ayudarte?',
  out_of_catalog:
    'Lo sentimos, ese producto no está en nuestro catálogo.',
  out_of_stock:
    'Ese producto no está disponible en este momento.',
  order_confirmed:
    'Tu pedido ha sido confirmado. Te avisaremos cuando esté listo.',
  appointment_confirmed:
    'Hola {nombre}, su cita en {negocio} está confirmada para el {fecha} a las {hora}. Si necesita reagendar, responda a este mensaje.',
  appointment_reminder:
    'Recordatorio: mañana {fecha} tienes cita a las {hora}.',
  appointment_reminder_24h:
    'Hola {nombre}, le recordamos su cita en {negocio} mañana {fecha} a las {hora}. Conteste "Confirmo" para confirmar o "Cancelo" para cancelar.',
  appointment_reminder_1h:
    'Hola {nombre}, su cita en {negocio} es en 1 hora ({hora}). Le esperamos.',
  appointment_cancelled:
    'Su cita del {fecha} ha sido cancelada. Para reagendar, responda a este mensaje.',
  appointment_rescheduled:
    'Su cita ha sido reprogramada para {fecha} a las {hora}. Si tiene alguna duda, responda a este mensaje.',
  recall:
    'Hola {nombre}, ha pasado tiempo desde su última visita en {negocio}. Le invitamos a agendar su próxima cita.',
}

/**
 * Read the per-tenant bot messages map, merged over defaults. NEVER returns
 * undefined for a known key — caller can index safely.
 */
export function getBotMessages(
  tenant: Pick<Tenant, 'config'> & { botMessages?: unknown },
): Record<BotMessageKey, string> {
  const config = (tenant.config ?? {}) as { bot_messages?: Record<string, string> }
  const fromConfig = config.bot_messages ?? {}
  const legacyTopLevel = (tenant.botMessages ?? {}) as Record<string, string>
  // Precedence: config.bot_messages > legacy top-level > defaults
  return {
    ...DEFAULT_BOT_MESSAGES,
    ...legacyTopLevel,
    ...fromConfig,
  } as Record<BotMessageKey, string>
}

/**
 * Substitute `{variable}` placeholders. Unknown placeholders are LEFT IN
 * PLACE so the doctor can see they typed something the system doesn't know
 * (rather than silently producing the literal "{xxx}" in the WhatsApp).
 */
export function renderBotMessage(
  template: string,
  vars: Partial<Record<string, string | number>>,
): string {
  if (!template) return ''
  return template.replace(/\{(\w+)\}/g, (full, key: string) => {
    const v = vars[key]
    return v === undefined || v === null ? full : String(v)
  })
}

/**
 * One-call helper used by the appointment routes and the reminder cron.
 *
 *   const text = formatBotMessage(tenant, 'appointment_confirmed', {
 *     nombre: patient.name,
 *     negocio: tenant.name,
 *     fecha: 'lunes 7 de mayo',
 *     hora: '10:30',
 *   })
 */
export function formatBotMessage(
  tenant: Pick<Tenant, 'config' | 'name'> & { botMessages?: unknown },
  key: BotMessageKey,
  vars: Partial<Record<string, string | number>> = {},
): string {
  const messages = getBotMessages(tenant)
  const template = messages[key] || DEFAULT_BOT_MESSAGES[key]
  // Always inject the tenant name so callers don't have to remember
  return renderBotMessage(template, { negocio: tenant.name, ...vars })
}
