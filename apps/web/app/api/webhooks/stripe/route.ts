export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, payments } from '@quote-engine/db';
import { StripeProvider } from '@quote-engine/payments';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const globalSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!globalSecret) {
      console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET not set');
      return NextResponse.json({ error: 'Server config error' }, { status: 500 });
    }

    const provider = new StripeProvider('unused', globalSecret);
    const event = await provider.parseWebhook(body, signature);

    const tenantId = event.metadata?.tenantId;
    if (!tenantId) {
      console.warn('[stripe-webhook] No tenantId in metadata', event.type);
      return NextResponse.json({ received: true });
    }

    if (event.status === 'completed') {
      await db
        .update(payments)
        .set({
          status: 'completed',
          paidAt: new Date(),
        })
        .where(
          and(
            eq(payments.processorPaymentId, event.externalId),
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
