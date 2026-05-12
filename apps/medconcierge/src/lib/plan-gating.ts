/**
 * Plan-tier feature gating — Auctorum.
 *
 * Pre-2026-05-11 there was zero plan gating across medconcierge:
 *   grep "tenant.plan ===" apps/medconcierge/src → 0 hits.
 * A 'basico' tenant had access to identical functionality as 'auctorum'
 * which meant zero reason to upgrade. This module is the policy table +
 * helpers that every paid-feature endpoint must consult.
 *
 * Pricing reference (MXN/mes):
 *   - basico:    $1,400  → core booking + 1 doctor + WhatsApp inbound
 *   - auctorum:  $1,800  → +campaigns, +Instagram, +RAG KB, +Stripe Connect,
 *                          +Smart Documents, +CFDI, +API access, +exports
 *   - enterprise: custom → everything + higher caps + dedicated support
 *
 * Add a feature flag here and call `requireFeature` / `hasFeature` at the
 * point of use. NEVER read `tenant.plan` directly in business code — the
 * matrix is the single source of truth.
 */

export interface PlanFeatures {
  /** Full TipTap-based clinical notes (basico = simple textarea). */
  clinical_records_full: boolean;
  /** WhatsApp marketing campaigns (audience → queue → worker). */
  campaigns: boolean;
  /** RAG knowledge base for AI agent. */
  rag_knowledge_base: boolean;
  /** Drag-and-drop portal builder (basico = fixed template). */
  portal_builder: boolean;
  /** Public REST API access (/api/v1/*). */
  api_access: boolean;
  /** Reports CSV / PDF export (basico = view only). */
  reports_export: boolean;
  /** Smart Documents AI (PDF/image classifier). */
  smart_documents: boolean;
  /** Instagram DM inbox + lead capture. */
  instagram_dm: boolean;
  /** Stripe Connect (patient → doctor payments). */
  stripe_connect: boolean;
  /** Mexican CFDI 4.0 invoicing via Facturapi. */
  cfdi_invoicing: boolean;
  /** Max users (admin / secretaria / operator / viewer combined). */
  max_users: number;
  /** Max active doctors in the tenant. */
  max_doctors: number;
}

export const PLAN_FEATURES: Record<string, PlanFeatures> = {
  basico: {
    clinical_records_full: false,
    campaigns: false,
    rag_knowledge_base: false,
    portal_builder: false,
    api_access: false,
    reports_export: false,
    smart_documents: false,
    instagram_dm: false,
    stripe_connect: false,
    cfdi_invoicing: false,
    max_users: 2,
    max_doctors: 1,
  },
  auctorum: {
    clinical_records_full: true,
    campaigns: true,
    rag_knowledge_base: true,
    portal_builder: true,
    api_access: true,
    reports_export: true,
    smart_documents: true,
    instagram_dm: true,
    stripe_connect: true,
    cfdi_invoicing: true,
    max_users: 8,
    max_doctors: 5,
  },
  enterprise: {
    clinical_records_full: true,
    campaigns: true,
    rag_knowledge_base: true,
    portal_builder: true,
    api_access: true,
    reports_export: true,
    smart_documents: true,
    instagram_dm: true,
    stripe_connect: true,
    cfdi_invoicing: true,
    max_users: 999,
    max_doctors: 999,
  },
};

/** Plan codes ranked by tier — used for sorting & "upgrade required" copy. */
export const PLAN_TIER_ORDER = ['basico', 'auctorum', 'enterprise'] as const;
export type PlanCode = (typeof PLAN_TIER_ORDER)[number];

/** Human-readable feature names (for UpgradePrompt copy). */
export const FEATURE_NAMES: Record<keyof PlanFeatures, string> = {
  clinical_records_full: 'Expediente clínico avanzado (SOAP, plantillas, plan de tratamiento)',
  campaigns: 'Campañas masivas de WhatsApp',
  rag_knowledge_base: 'Base de conocimiento con IA (RAG)',
  portal_builder: 'Constructor de sitio web (drag & drop)',
  api_access: 'Acceso a la API pública',
  reports_export: 'Exportar reportes (CSV / PDF)',
  smart_documents: 'Documentos inteligentes (clasificación automática con IA)',
  instagram_dm: 'Bandeja de Instagram Direct',
  stripe_connect: 'Cobros a pacientes con Stripe Connect',
  cfdi_invoicing: 'Facturación electrónica CFDI 4.0',
  max_users: 'Usuarios adicionales',
  max_doctors: 'Médicos adicionales',
};

export function planFeatures(plan: string | null | undefined): PlanFeatures {
  // Unknown plans default to 'basico' — never expose paid features to an
  // unmatched plan code.
  const code = (plan ?? 'basico').toLowerCase();
  return PLAN_FEATURES[code] ?? PLAN_FEATURES.basico;
}

export function hasFeature(
  plan: string | null | undefined,
  feature: keyof PlanFeatures,
): boolean {
  const f = planFeatures(plan)[feature];
  // Numeric features (max_users, max_doctors) are not a boolean check —
  // callers should use `planFeatures(plan).max_users` directly.
  return typeof f === 'boolean' ? f : false;
}

export class PlanLimitError extends Error {
  readonly code = 'PLAN_LIMIT';
  constructor(
    public readonly feature: keyof PlanFeatures,
    public readonly plan: string,
  ) {
    super(
      `Esta función requiere un plan superior. Función: ${FEATURE_NAMES[feature]}. Plan actual: ${plan}.`,
    );
    this.name = 'PlanLimitError';
  }
}

/** Throw if the plan does not include the feature. Use in API routes that
 * should reject with HTTP 402 (Payment Required). */
export function requireFeature(
  plan: string | null | undefined,
  feature: keyof PlanFeatures,
): void {
  if (!hasFeature(plan, feature)) {
    throw new PlanLimitError(feature, plan ?? 'basico');
  }
}

/** Returns the lowest plan that includes the feature — useful for upgrade
 * prompts ("To use X, upgrade to Y"). */
export function minPlanFor(feature: keyof PlanFeatures): PlanCode | null {
  for (const code of PLAN_TIER_ORDER) {
    const value = PLAN_FEATURES[code][feature];
    if (typeof value === 'boolean' && value) return code;
  }
  return null;
}
