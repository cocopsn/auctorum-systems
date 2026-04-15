
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import crypto from 'crypto';
import type { PaymentProvider, PaymentLinkParams, PaymentLinkResult, WebhookEvent } from './types';

export class MercadoPagoProvider implements PaymentProvider {
  name = 'mercadopago' as const;
  private config: MercadoPagoConfig;

  constructor(accessToken: string) {
    this.config = new MercadoPagoConfig({ accessToken });
  }

  async createPaymentLink(params: PaymentLinkParams): Promise<PaymentLinkResult> {
    const preference = new Preference(this.config);

    const result = await preference.create({
      body: {
        items: [
          {
            id: params.appointmentId || `payment-${Date.now()}`,
            title: params.description,
            quantity: 1,
            unit_price: params.amount / 100, // Convert cents to MXN
            currency_id: params.currency || 'MXN',
          },
        ],
        payer: {
          name: params.patientName || '',
          email: params.patientEmail || '',
        },
        metadata: {
          tenant_id: params.tenantId,
          appointment_id: params.appointmentId || '',
          patient_name: params.patientName || '',
          ...params.metadata,
        },
        back_urls: {
          success: 'https://auctorum.com.mx/payment/success',
          failure: 'https://auctorum.com.mx/payment/cancel',
          pending: 'https://auctorum.com.mx/payment/pending',
        },
        auto_return: 'approved',
        expires: true,
        expiration_date_to: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        notification_url: 'https://auctorum.com.mx/api/webhooks/mercadopago',
      },
    });

    return {
      url: result.init_point!,
      externalId: result.id!,
      provider: 'mercadopago',
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
    };
  }

  async parseWebhook(body: string | Buffer, _signature: string): Promise<WebhookEvent> {
    const data = typeof body === 'string' ? JSON.parse(body) : JSON.parse(body.toString());

    // MercadoPago sends notification with { type, data: { id } }
    if (data.type === 'payment') {
      const payment = new Payment(this.config);
      const paymentData = await payment.get({ id: data.data.id });

      let status: WebhookEvent['status'] = 'pending';
      if (paymentData.status === 'approved') status = 'completed';
      else if (paymentData.status === 'rejected') status = 'failed';
      else if (paymentData.status === 'refunded') status = 'refunded';

      return {
        provider: 'mercadopago',
        type: `payment.${paymentData.status}`,
        externalId: String(paymentData.id),
        status,
        amount: (paymentData.transaction_amount || 0) * 100, // Convert to cents
        currency: (paymentData.currency_id || 'MXN').toUpperCase(),
        metadata: (paymentData.metadata || {}) as Record<string, string>,
        raw: paymentData,
      };
    }

    // Default for non-payment events
    return {
      provider: 'mercadopago',
      type: data.type || 'unknown',
      externalId: data.data?.id || '',
      status: 'pending',
      amount: 0,
      currency: 'MXN',
      raw: data,
    };
  }

  async verifyConnection(): Promise<{ valid: boolean; accountName?: string; error?: string }> {
    try {
      // Use a simple API call to verify the access token
      const payment = new Payment(this.config);
      // Search for recent payments (limit 1) just to test auth
      await payment.search({ options: { limit: 1 } });
      return { valid: true, accountName: 'MercadoPago Account' };
    } catch (err) {
      return {
        valid: false,
        error: err instanceof Error ? err.message : 'Invalid access token',
      };
    }
  }
}
