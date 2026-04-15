
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, payments, tenants } from '@quote-engine/db';
import { StripeProvider } from '@quote-engine/payments';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // We need to find the tenant's webhook secret. For Stripe Connect,
    // there's a global endpoint secret. For direct, each tenant has theirs.
    // Strategy: look for the payment by checking all active Stripe tenants.
    // In production with many tenants, use a shared endpoint secret.
    const globalSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!globalSecret) {
      console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET not set');
      return NextResponse.json({ error: 'Server config error' }, { status: 500 });
    }

    const provider = new StripeProvider('unused', globalSecret);
    const event = await provider.parseWebhook(body, signature);

    // Find the payment by externalId
    const tenantId = event.metadata?.tenantId;
    if (!tenantId) {
      console.warn('[stripe-webhook] No tenantId in metadata', event.type);
      return NextResponse.json({ received: true });
    }

    if (event.status === 'completed') {
      // Update payment record
      await db
        .update(payments)
        .set({
          status: 'completed',
          paidAt: new Date(),
          externalId: event.externalId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(payments.externalId, event.externalId),
            eq(payments.tenantId, tenantId)
          )
        );

      console.log(`[stripe-webhook] Payment completed: ${event.externalId} for tenant ${tenantId}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[stripe-webhook]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Webhook error' }, { status: 400 });
  }
}
