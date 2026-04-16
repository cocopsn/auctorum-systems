import Stripe from 'stripe';
import type { PaymentProvider, PaymentLinkParams, PaymentLinkResult, WebhookEvent } from './types';

export class StripeProvider implements PaymentProvider {
  name = 'stripe' as const;
  private client: Stripe;
  private webhookSecret?: string;

  constructor(secretKey: string, webhookSecret?: string) {
    this.client = new Stripe(secretKey);
    this.webhookSecret = webhookSecret;
  }

  async createPaymentLink(params: PaymentLinkParams): Promise<PaymentLinkResult> {
    const session = await this.client.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: (params.currency || 'MXN').toLowerCase(),
            product_data: {
              name: params.description,
            },
            unit_amount: params.amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: params.patientEmail || undefined,
      metadata: {
        tenantId: params.tenantId,
        appointmentId: params.appointmentId || '',
        patientName: params.patientName || '',
        ...(params.metadata || {}),
      },
      success_url: `https://auctorum.com.mx/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://auctorum.com.mx/payment/cancel`,
    });

    return {
      url: session.url!,
      externalId: session.id,
      provider: 'stripe',
      expiresAt: new Date(Date.now() + 3600 * 1000),
    };
  }

  async parseWebhook(body: string | Buffer, signature: string): Promise<WebhookEvent> {
    if (!this.webhookSecret) throw new Error('Stripe webhook secret not configured');

    const event = this.client.webhooks.constructEvent(
      typeof body === 'string' ? body : body.toString(),
      signature,
      this.webhookSecret
    );

    const obj = event.data.object as unknown as Record<string, unknown>;

    let status: WebhookEvent['status'] = 'pending';
    if (event.type === 'checkout.session.completed') status = 'completed';
    else if (event.type === 'checkout.session.expired') status = 'failed';
    else if (event.type === 'charge.refunded') status = 'refunded';

    return {
      provider: 'stripe',
      type: event.type,
      externalId: String(obj.id || ''),
      status,
      amount: Number(obj.amount_total || 0),
      currency: String(obj.currency || 'mxn').toUpperCase(),
      metadata: (obj.metadata || {}) as Record<string, string>,
      raw: event,
    };
  }

  async verifyConnection(): Promise<{ valid: boolean; accountName?: string; error?: string }> {
    try {
      const account = await this.client.accounts.retrieve();
      return {
        valid: true,
        accountName: (account as any).business_profile?.name || account.id,
      };
    } catch (err) {
      return {
        valid: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }
}
