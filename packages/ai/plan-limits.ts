/**
 * Per-plan caps and the add-on packs doctors can buy when they hit one.
 *
 * `-1` means unlimited for that metric. The usage tracker special-cases
 * unlimited so it never short-circuits or asks the user to upgrade.
 */

export type PlanId = 'basico' | 'auctorum' | 'enterprise'

/** Logical metrics tracked. Names match `tenant_usage` columns where applicable. */
export type UsageMetric =
  | 'whatsapp_messages'
  | 'api_calls'           // monthly cap = api_calls_per_hour * 24 * 30
  | 'ai_tokens'
  | 'storage_bytes'
  | 'patients'
  | 'appointments'
  | 'campaigns'
  | 'doctors'
  | 'users'

export interface PlanLimits {
  whatsapp_messages: number
  api_calls_per_hour: number
  ai_tokens: number
  storage_gb: number
  patients: number
  campaigns_per_month: number
  doctors: number
  users: number
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  basico: {
    whatsapp_messages: 500,
    api_calls_per_hour: 100,
    ai_tokens: 500_000,
    storage_gb: 5,
    patients: 100,
    campaigns_per_month: 5,
    doctors: 1,
    users: 1,
  },
  auctorum: {
    whatsapp_messages: 1_000,
    api_calls_per_hour: 500,
    ai_tokens: 2_000_000,
    storage_gb: 20,
    patients: -1,
    campaigns_per_month: 20,
    doctors: 5,
    users: 8,
  },
  enterprise: {
    whatsapp_messages: -1,
    api_calls_per_hour: -1,
    ai_tokens: -1,
    storage_gb: 100,
    patients: -1,
    campaigns_per_month: -1,
    doctors: -1,
    users: -1,
  },
}

/** Returns the resolved limits for a tenant plan, falling back to basico. */
export function getPlanLimits(plan: string | null | undefined): PlanLimits {
  return PLAN_LIMITS[(plan as PlanId) ?? 'basico'] ?? PLAN_LIMITS.basico
}

export interface AddonPackage {
  id: string
  name: string
  description: string
  /** Units granted (e.g. messages, tokens, bytes). */
  quantity: number
  /** Centavos MXN. */
  price: number
  /** Logical metric in `tenant_usage` extended by this pack. */
  type: 'whatsapp_messages' | 'api_calls' | 'ai_tokens' | 'storage_bytes'
}

export const ADDON_PACKAGES: AddonPackage[] = [
  {
    id: 'whatsapp_500',
    name: '+500 mensajes WhatsApp',
    description: 'Extiende tu cuota mensual de mensajes en 500.',
    quantity: 500,
    price: 20_000,
    type: 'whatsapp_messages',
  },
  {
    id: 'whatsapp_1000',
    name: '+1,000 mensajes WhatsApp',
    description: 'Extiende tu cuota mensual de mensajes en 1,000.',
    quantity: 1_000,
    price: 35_000,
    type: 'whatsapp_messages',
  },
  {
    id: 'api_10k',
    name: '+10,000 API calls',
    description: '10,000 llamadas adicionales a la API pública v1.',
    quantity: 10_000,
    price: 15_000,
    type: 'api_calls',
  },
  {
    id: 'storage_10gb',
    name: '+10 GB almacenamiento',
    description: '10 GB extra para archivos clínicos y documentos.',
    quantity: 10 * 1_000_000_000,
    price: 10_000,
    type: 'storage_bytes',
  },
  {
    id: 'ai_1m',
    name: '+1M tokens AI',
    description: '1 millón de tokens adicionales para el asistente.',
    quantity: 1_000_000,
    price: 25_000,
    type: 'ai_tokens',
  },
]

export function getAddonPackage(id: string): AddonPackage | null {
  return ADDON_PACKAGES.find((p) => p.id === id) ?? null
}

/** YYYY-MM string for the current UTC month. */
export function currentPeriod(now: Date = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}
