/**
 * Auto-respond a inbound ad leads via WhatsApp.
 *
 * Velocidad de respuesta es lo que mueve la conversión de lead-ads médicos:
 * un lead contactado en los primeros 5 min convierte 9× más que uno
 * contactado en 30 min (Harvard Business Review, 2011 — los números siguen
 * vigentes). Esta función se llama desde:
 *
 *   - apps/medconcierge/src/app/api/webhooks/meta-leads/route.ts
 *   - apps/medconcierge/src/app/api/webhooks/google-leads/route.ts
 *   - apps/medconcierge/src/app/api/dashboard/leads/[id]/contact/route.ts (manual retry)
 *
 * Es best-effort y nunca debe lanzar — un fallo de WhatsApp no debe romper
 * la captura del lead (el lead ya quedó en DB; el doctor puede contactarlo
 * a mano desde el dashboard).
 */

import { eq } from 'drizzle-orm'
import { db, adLeads, type AdLead, type Tenant, type TenantConfig } from '@quote-engine/db'
import { sendWhatsAppMessage } from './whatsapp'

export type AutoContactOptions = {
  /** Override del mensaje configurado por el tenant (para retries manuales). */
  customMessage?: string
  /** No actualizar status — útil para re-enviar sin avanzar el pipeline. */
  skipStatusUpdate?: boolean
}

export type AutoContactResult = {
  ok: boolean
  reason?: 'no-phone' | 'send-failed' | 'invalid-phone' | 'sent'
}

function firstName(fullName: string | null | undefined): string {
  if (!fullName) return ''
  const trimmed = fullName.trim()
  if (!trimmed) return ''
  return trimmed.split(/\s+/)[0]
}

function defaultGreeting(tenant: Tenant, lead: AdLead): string {
  const config = (tenant.config ?? {}) as TenantConfig
  const businessName = tenant.name
  // medical.specialty + tenant.name → "Dra. María García"
  // Caemos a tenant.name si no hay nombre de doctor configurado.
  const doctorName =
    (config as any)?.medical?.doctor_name ||
    (config as any)?.medical?.display_name ||
    tenant.name
  const fname = firstName(lead.name)
  const hello = fname ? `¡Hola ${fname}!` : '¡Hola!'

  if (lead.source === 'facebook' || lead.source === 'instagram') {
    return (
      `${hello} 👋\n\n` +
      `Gracias por su interés en ${businessName}. Vimos que nos contactó a través de nuestro anuncio.\n\n` +
      `¿Le gustaría agendar una cita con ${doctorName}? Puedo ayudarle a encontrar el horario que más le convenga.\n\n` +
      `Responda "Sí" para ver los horarios disponibles, o escriba cualquier pregunta que tenga. 😊`
    )
  }

  if (lead.source === 'google') {
    return (
      `${hello} 👋\n\n` +
      `Gracias por contactar a ${businessName}. ¿Le gustaría agendar una cita con ${doctorName}?\n\n` +
      `Escriba "Sí" para ver horarios o cualquier pregunta que tenga.`
    )
  }

  return `${hello} Gracias por contactar a ${businessName}. ¿En qué podemos ayudarle?`
}

export async function autoContactLead(
  tenant: Tenant,
  lead: AdLead,
  opts: AutoContactOptions = {},
): Promise<AutoContactResult> {
  if (!lead.phone || lead.phone.trim().length < 8) {
    return { ok: false, reason: 'no-phone' }
  }

  const message = opts.customMessage?.trim() || defaultGreeting(tenant, lead)

  let sent = false
  try {
    sent = await sendWhatsAppMessage(lead.phone, message)
  } catch (err) {
    console.warn(
      `[lead-autocontact] tenant=${tenant.id} lead=${lead.id} send error:`,
      err instanceof Error ? err.message : err,
    )
    sent = false
  }

  if (!sent) {
    return { ok: false, reason: 'send-failed' }
  }

  if (!opts.skipStatusUpdate) {
    try {
      await db
        .update(adLeads)
        .set({
          whatsappSent: true,
          whatsappSentAt: new Date(),
          // Solo avanzamos a 'contacted' si seguía en 'new' — no retrocedemos
          // ni saltamos sobre estados manuales del doctor.
          status: lead.status === 'new' ? 'contacted' : lead.status,
        })
        .where(eq(adLeads.id, lead.id))
    } catch (err) {
      console.warn(
        `[lead-autocontact] tenant=${tenant.id} lead=${lead.id} db update failed:`,
        err instanceof Error ? err.message : err,
      )
      // El mensaje ya se envió — no es fatal si el update falla
    }
  }

  return { ok: true, reason: 'sent' }
}

/**
 * Normaliza teléfono a formato E.164 simple para MX (52XXXXXXXXXX) sin '+'.
 * Mismo formato que `whatsapp.ts.normalizePhone`. Útil cuando el lead viene
 * con número en formato local del país y queremos guardarlo limpio en DB.
 */
export function formatPhoneMX(raw: string): string {
  if (!raw) return ''
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('52') && digits.length >= 12) return digits
  if (digits.length === 10) return `52${digits}`
  return digits
}
