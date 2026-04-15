
/**
 * Payment Provider abstraction for Auctorum Systems.
 *
 * Each tenant (doctor) has their own processor credentials stored
 * in tenants.config.paymentConfig. This package provides a unified
 * interface so the rest of the system works identically regardless
 * of whether the doctor chose Stripe, MercadoPago, or manual.
 */

export interface PaymentLinkParams {
  tenantId: string;
  amount: number;          // Cents (Stripe) or MXN (MercadoPago)
  currency: string;        // 'MXN', 'USD'
  description: string;
  patientName?: string;
  patientEmail?: string;
  appointmentId?: string;
  metadata?: Record<string, string>;
}

export interface PaymentLinkResult {
  url: string;
  externalId: string;      // Stripe Session ID or MP Preference ID
  provider: 'stripe' | 'mercadopago';
  expiresAt?: Date;
}

export interface WebhookEvent {
  provider: 'stripe' | 'mercadopago';
  type: string;            // 'payment.succeeded', 'payment.failed', etc.
  externalId: string;
  status: 'completed' | 'failed' | 'pending' | 'refunded';
  amount: number;
  currency: string;
  metadata?: Record<string, string>;
  raw: unknown;            // Raw event for debugging
}

export interface PaymentProvider {
  name: 'stripe' | 'mercadopago';

  /** Generate a payment link/checkout session */
  createPaymentLink(params: PaymentLinkParams): Promise<PaymentLinkResult>;

  /** Verify webhook signature and parse event */
  parseWebhook(body: string | Buffer, signature: string): Promise<WebhookEvent>;

  /** Verify that API keys are valid */
  verifyConnection(): Promise<{ valid: boolean; accountName?: string; error?: string }>;
}

export interface TenantPaymentConfig {
  activeProcessor: 'manual' | 'stripe' | 'mercadopago';
  stripe?: {
    secretKey?: string;
    webhookSecret?: string;
    enabled?: boolean;
  };
  mercadopago?: {
    accessToken?: string;
    enabled?: boolean;
  };
  defaultCurrency?: string;
}
