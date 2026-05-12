/**
 * Plan-tier feature gating — Auctorum (web B2B).
 *
 * Mirror of apps/medconcierge/src/lib/plan-gating.ts. Kept duplicated
 * because the monorepo doesn't have a shared `lib` package and the file
 * has zero runtime dependencies — easier to maintain two 100-line files
 * than to spin up a new workspace package for a policy table.
 *
 * Pre-2026-05-11 the web app had zero plan gating either: subscription
 * upgrades were free and campaign 'send' was a placebo. This module is
 * the policy table that paid-feature endpoints consult.
 */

export interface PlanFeatures {
  /** WhatsApp marketing campaigns (audience → queue → worker). */
  campaigns: boolean;
  /** Public REST API access (/api/v1/*). */
  api_access: boolean;
  /** Reports CSV / PDF export. */
  reports_export: boolean;
  /** Stripe + MercadoPago payment links to clients. */
  payment_links: boolean;
  /** Mexican CFDI 4.0 invoicing via Facturapi. */
  cfdi_invoicing: boolean;
  /** Advanced quote PDF customization (custom footer, logos, fonts). */
  custom_branded_pdfs: boolean;
  /** Max users (admin + operator + viewer combined). */
  max_users: number;
  /** Max active products / SKUs in the catalog. */
  max_products: number;
}

export const PLAN_FEATURES: Record<string, PlanFeatures> = {
  basico: {
    campaigns: false,
    api_access: false,
    reports_export: false,
    payment_links: false,
    cfdi_invoicing: false,
    custom_branded_pdfs: false,
    max_users: 2,
    max_products: 100,
  },
  auctorum: {
    campaigns: true,
    api_access: true,
    reports_export: true,
    payment_links: true,
    cfdi_invoicing: true,
    custom_branded_pdfs: true,
    max_users: 8,
    max_products: 5000,
  },
  enterprise: {
    campaigns: true,
    api_access: true,
    reports_export: true,
    payment_links: true,
    cfdi_invoicing: true,
    custom_branded_pdfs: true,
    max_users: 999,
    max_products: 999_999,
  },
};

export const PLAN_TIER_ORDER = ['basico', 'auctorum', 'enterprise'] as const;
export type PlanCode = (typeof PLAN_TIER_ORDER)[number];

export const FEATURE_NAMES: Record<keyof PlanFeatures, string> = {
  campaigns: 'Campañas masivas de WhatsApp',
  api_access: 'Acceso a la API pública',
  reports_export: 'Exportar reportes (CSV / PDF)',
  payment_links: 'Enviar links de pago a clientes',
  cfdi_invoicing: 'Facturación electrónica CFDI 4.0',
  custom_branded_pdfs: 'PDFs de cotización personalizados',
  max_users: 'Usuarios adicionales',
  max_products: 'Productos / SKUs',
};

export function planFeatures(plan: string | null | undefined): PlanFeatures {
  const code = (plan ?? 'basico').toLowerCase();
  return PLAN_FEATURES[code] ?? PLAN_FEATURES.basico;
}

export function hasFeature(
  plan: string | null | undefined,
  feature: keyof PlanFeatures,
): boolean {
  const f = planFeatures(plan)[feature];
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

export function requireFeature(
  plan: string | null | undefined,
  feature: keyof PlanFeatures,
): void {
  if (!hasFeature(plan, feature)) {
    throw new PlanLimitError(feature, plan ?? 'basico');
  }
}

export function minPlanFor(feature: keyof PlanFeatures): PlanCode | null {
  for (const code of PLAN_TIER_ORDER) {
    const value = PLAN_FEATURES[code][feature];
    if (typeof value === 'boolean' && value) return code;
  }
  return null;
}
