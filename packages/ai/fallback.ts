/**
 * Resilience for AI calls.
 *
 * - Circuit breaker around OpenAI: after N consecutive failures the breaker
 *   opens and we serve canned fallback responses for ~1 minute, then try
 *   again. Avoids stampeding a struggling upstream and keeps the bot able
 *   to say *something* when OpenAI is down.
 *
 * - Fallback responses are tenant-aware: they pull the welcome message,
 *   schedule, and emergency keywords from the tenant's specialty template
 *   so the doctor's bot still speaks in their voice during an outage.
 *
 * Module-level state is intentional — each Node.js process keeps its own
 * breaker. PM2 runs auctorum-worker as a single fork, so the state is
 * effectively per-tenant cluster of one.
 */

import { getSpecialtyTemplate, type SpecialtyId } from './specialty-templates'

// ---------------- Circuit breaker ----------------

const CIRCUIT_THRESHOLD = 3        // consecutive failures before opening
const CIRCUIT_RESET_MS  = 60_000   // 1 min half-open delay

let consecutiveFailures = 0
let circuitOpen = false
let circuitOpenedAt = 0

export function recordSuccess(): void {
  if (consecutiveFailures > 0 || circuitOpen) {
    console.log('[CircuitBreaker] OpenAI recovered, closing breaker')
  }
  consecutiveFailures = 0
  circuitOpen = false
}

export function recordFailure(err?: unknown): void {
  consecutiveFailures += 1
  if (consecutiveFailures >= CIRCUIT_THRESHOLD && !circuitOpen) {
    circuitOpen = true
    circuitOpenedAt = Date.now()
    console.error(
      `[CircuitBreaker] OpenAI circuit OPEN after ${consecutiveFailures} failures`,
      err instanceof Error ? err.message : err,
    )
  }
}

export function isCircuitOpen(): boolean {
  if (!circuitOpen) return false
  if (Date.now() - circuitOpenedAt > CIRCUIT_RESET_MS) {
    circuitOpen = false
    consecutiveFailures = 0
    console.log('[CircuitBreaker] OpenAI circuit reset to half-open')
    return false
  }
  return true
}

export function getCircuitStatus() {
  return {
    open: circuitOpen,
    consecutiveFailures,
    openedAt: circuitOpen ? new Date(circuitOpenedAt).toISOString() : null,
  }
}

// ---------------- Fallback response generator ----------------

export type FallbackTenantHint = {
  /** Specialty template id, e.g. "odontologia" */
  specialty?: string
  /** Doctor display name */
  doctorName?: string
  /** Practice name */
  businessName?: string
  /** Schedule snapshot from tenant config */
  schedule?: { weekdays?: { start?: string; end?: string }; saturday?: { start?: string; end?: string } | null }
  /** Address for "ubicación" intent */
  address?: string
}

/**
 * Pure function. Returns true if the user's message contains any keyword
 * suggesting a medical emergency. Combines specialty-specific keywords (when
 * a template id is provided) with a baseline general-medical set that
 * applies to every specialty.
 *
 * This is the canonical emergency check — `generateFallbackResponse` calls
 * it, and the WhatsApp worker imports it directly to short-circuit the AI
 * pipeline before paying for an OpenAI call on a literal "no puedo respirar".
 */
const BASELINE_EMERGENCY_KEYWORDS = [
  'emergencia',
  'urgente',
  'urgencia',
  'dolor fuerte',
  'sangr',                  // sangrado / sangrando / sangra
  'no puedo respirar',
  'convulsion',
  'convulsión',
  'desmay',                 // desmayo / desmayada / desmayándose
  'inconsciente',
  'no responde',
  'no despierta',
  'perdió el conocimiento',
  'perdi el conocimiento',
  'pierde el conocimiento',
  'morado',
  'azul',                   // morado/azul = cyanosis indicators
  'suicid',
  'matarme',
  'reaccion alergica',
  'reacción alérgica',
  'anafilac',
] as const

export function isEmergency(
  message: string,
  specialty?: SpecialtyId | string | null,
): boolean {
  if (!message) return false
  const lower = message.toLowerCase()
  const tpl = specialty ? getSpecialtyTemplate(specialty as SpecialtyId) : null
  const keywords = [
    ...(tpl?.emergencyKeywords ?? []),
    ...BASELINE_EMERGENCY_KEYWORDS,
  ].map((k) => k.toLowerCase())
  return keywords.some((k) => lower.includes(k))
}

/**
 * Build a canned response based on the tenant's specialty template plus
 * lightweight keyword detection over the user's message. Always returns
 * a string — never throws.
 */
export function generateFallbackResponse(message: string, tenant: FallbackTenantHint = {}): string {
  const lower = (message ?? '').toLowerCase()
  const businessName = tenant.businessName ?? 'el consultorio'
  const doctorName = tenant.doctorName ?? 'el doctor/a'
  const tpl = getSpecialtyTemplate((tenant.specialty as SpecialtyId | undefined) ?? 'medicina_general' as SpecialtyId)

  // 1. Emergency intent — always wins
  if (isEmergency(message, tenant.specialty as SpecialtyId | undefined)) {
    return `⚠️ Si está en una emergencia médica, llame al 911 o acuda a urgencias inmediatamente.\n\nNuestro asistente está temporalmente con intermitencia. Si no es emergencia, intente de nuevo en unos minutos o llame directo al consultorio. — ${businessName}`
  }

  // 2. Appointment intent
  if (matchAny(lower, ['cita', 'agendar', 'turno', 'consulta', 'disponib', 'reservar'])) {
    return `Gracias por contactarnos. Nuestro sistema está en mantenimiento breve.\n\nPara agendar su cita:\n1. Intente de nuevo en 5 minutos, o\n2. Llame directo al consultorio.\n\nDisculpe las molestias. — ${businessName}`
  }

  // 3. Price / cost intent
  if (matchAny(lower, ['precio', 'costo', 'cuánto cuesta', 'cuanto cuesta', 'tarifa'])) {
    const faq = (tpl?.faqs ?? []).find(
      (f) => f.question.toLowerCase().includes('costo') || f.question.toLowerCase().includes('precio'),
    )
    if (faq) return faq.answer
    return `Los precios varían según el tratamiento. Le invitamos a agendar una cita con ${doctorName} para un presupuesto personalizado. Intente de nuevo en unos minutos.`
  }

  // 4. Hours intent
  if (matchAny(lower, ['horario', 'a qué hora', 'a que hora', 'atienden', 'abren', 'cierran'])) {
    const sch = tenant.schedule ?? tpl?.suggestedSchedule
    if (sch?.weekdays?.start && sch.weekdays.end) {
      const wd = `lunes a viernes de ${sch.weekdays.start} a ${sch.weekdays.end}`
      const sat = sch.saturday?.start ? `, sábados de ${sch.saturday.start} a ${sch.saturday.end}` : ''
      return `Nuestro horario de atención es ${wd}${sat}.\n\nIntente de nuevo en unos minutos para agendar su cita. — ${businessName}`
    }
  }

  // 5. Location intent
  if (matchAny(lower, ['ubicación', 'ubicacion', 'dirección', 'direccion', 'dónde están', 'donde estan', 'cómo llegar', 'como llegar'])) {
    if (tenant.address) {
      return `Estamos en: ${tenant.address}\n\nIntente de nuevo en unos minutos para agendar. — ${businessName}`
    }
  }

  // 6. Greeting / very short message — use template welcome
  if (matchAny(lower, ['hola', 'buenas', 'buenos días', 'buenos dias', 'buenas tardes', 'qué tal', 'que tal']) || lower.length < 15) {
    const welcome = tpl?.botMessages?.welcome
    if (welcome) {
      return welcome
        .replace(/\{nombre\}/g, 'paciente')
        .replace(/\{negocio\}/g, businessName)
    }
  }

  // 7. Default
  return `Gracias por su mensaje. Nuestro sistema está experimentando una breve intermitencia. Por favor intente de nuevo en 5 minutos o llame directo al consultorio. Disculpe las molestias. — ${businessName}`
}

function matchAny(haystack: string, needles: string[]): boolean {
  return needles.some((n) => haystack.includes(n))
}

// ---------------- Wrapped call helper ----------------

/**
 * Wrap an OpenAI call so the circuit breaker is updated automatically and
 * a fallback response is returned if the breaker is open or the call fails.
 *
 * Usage:
 *
 *   const reply = await withAiFallback(
 *     userMessage,
 *     tenantHint,
 *     () => callOpenAIChat(userMessage, tenant),
 *   )
 */
export async function withAiFallback(
  userMessage: string,
  tenant: FallbackTenantHint,
  call: () => Promise<string>,
): Promise<{ reply: string; fromFallback: boolean }> {
  if (isCircuitOpen()) {
    return { reply: generateFallbackResponse(userMessage, tenant), fromFallback: true }
  }
  try {
    const reply = await call()
    recordSuccess()
    return { reply, fromFallback: false }
  } catch (err) {
    recordFailure(err)
    return { reply: generateFallbackResponse(userMessage, tenant), fromFallback: true }
  }
}
