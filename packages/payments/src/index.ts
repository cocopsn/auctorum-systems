// ---------------------------------------------------------------------------
// Tenant-side payment processing (doctor collecting from patients)
// ---------------------------------------------------------------------------
export type {
  PaymentProvider,
  PaymentLinkParams,
  PaymentLinkResult,
  WebhookEvent,
  TenantPaymentConfig,
} from "./types";

export { StripeProvider } from "./stripe";
export { MercadoPagoProvider } from "./mercadopago";

import type { Tenant } from "@quote-engine/db";
import type {
  PaymentProvider,
  TenantPaymentConfig,
} from "./types";
import { StripeProvider } from "./stripe";
import { MercadoPagoProvider } from "./mercadopago";

/**
 * Factory: resolve the correct payment provider for a tenant.
 *
 * Returns null if the tenant uses manual payments or has no keys configured.
 * This is by design — many doctors start with manual and upgrade later.
 */
export function getPaymentProvider(tenant: Tenant): PaymentProvider | null {
  const config = (tenant.config as any)?.paymentConfig as
    | TenantPaymentConfig
    | undefined;
  if (!config) return null;

  switch (config.activeProcessor) {
    case "stripe": {
      const key = config.stripe?.secretKey;
      if (!key || !config.stripe?.enabled) return null;
      return new StripeProvider(key, config.stripe.webhookSecret);
    }
    case "mercadopago": {
      const token = config.mercadopago?.accessToken;
      if (!token || !config.mercadopago?.enabled) return null;
      return new MercadoPagoProvider(token);
    }
    default:
      return null; // manual — no provider needed
  }
}

/**
 * Check if a tenant has a payment provider configured and active.
 */
export function hasPaymentProvider(tenant: Tenant): boolean {
  return getPaymentProvider(tenant) !== null;
}

// ---------------------------------------------------------------------------
// Platform SaaS billing (Auctorum collecting subscription fees from tenants)
// ---------------------------------------------------------------------------
export {
  stripe,
  STRIPE_PLANS,
  type PlanId,
  createCheckoutSession,
  createPortalSession,
  getSubscription,
  cancelSubscription,
  constructWebhookEvent,
} from "./billing-stripe";

export {
  createMPPreference,
  getMPPayment,
  verifyMPWebhook,
} from "./billing-mercadopago";
