import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia" as any,
});

export { stripe };

// ---------------------------------------------------------------------------
// Plan mapping — SaaS subscription plans for Auctorum platform billing
// ---------------------------------------------------------------------------

export const STRIPE_PLANS = {
  basico: {
    priceId: process.env.STRIPE_PRICE_BASICO!,
    name: "Plan Básico",
    amount: 1400,
    features: [
      "Chatbot WhatsApp IA",
      "Agenda automatizada",
      "Recordatorios 24h+1h",
      "Landing personalizada",
      "Portal pacientes",
      "200 msgs/mes",
    ],
  },
  auctorum: {
    priceId: process.env.STRIPE_PRICE_AUCTORUM!,
    name: "Plan Auctorum",
    amount: 1800,
    features: [
      "Todo del Plan Básico",
      "Expedientes clínicos",
      "Campañas WhatsApp",
      "Dashboard personalizable",
      "Google Calendar",
      "Soporte prioritario",
      "1,000 msgs/mes",
    ],
  },
} as const;

export type PlanId = keyof typeof STRIPE_PLANS;

// ---------------------------------------------------------------------------
// Checkout Session — new subscription
// ---------------------------------------------------------------------------

export async function createCheckoutSession(params: {
  tenantId: string;
  planId: PlanId;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const plan = STRIPE_PLANS[params.planId];
  if (!plan) throw new Error(`Invalid plan: ${params.planId}`);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: plan.priceId, quantity: 1 }],
    customer_email: params.customerEmail,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      tenant_id: params.tenantId,
      plan_id: params.planId,
    },
    subscription_data: {
      metadata: {
        tenant_id: params.tenantId,
        plan_id: params.planId,
      },
    },
  });

  return session;
}

// ---------------------------------------------------------------------------
// Customer Portal — manage subscription, payment method, cancel
// ---------------------------------------------------------------------------

export async function createPortalSession(
  customerId: string,
  returnUrl: string
) {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

// ---------------------------------------------------------------------------
// Subscription helpers
// ---------------------------------------------------------------------------

export async function getSubscription(subscriptionId: string) {
  return stripe.subscriptions.retrieve(subscriptionId);
}

export async function cancelSubscription(subscriptionId: string) {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

// ---------------------------------------------------------------------------
// Webhook signature verification
// ---------------------------------------------------------------------------

export function constructWebhookEvent(body: string, signature: string) {
  return stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
}
