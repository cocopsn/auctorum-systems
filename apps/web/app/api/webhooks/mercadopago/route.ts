
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, payments } from '@quote-engine/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    // MercadoPago IPN doesn't include full payment data — only type + id.
    // We need to fetch the payment details from their API using the
    // tenant's access token. For now, parse the notification.
    const data = JSON.parse(body);

    if (data.type !== 'payment') {
      return NextResponse.json({ received: true });
    }

    // The preference metadata contains our tenantId
    // In production, we'd look up the tenant by the preference/payment
    console.log(`[mercadopago-webhook] Payment notification: ${data.data?.id}`);

    // Update any matching payment
    if (data.data?.id) {
      const [updated] = await db
        .update(payments)
        .set({
          status: 'completed',
          paidAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(payments.externalId, String(data.data.id)))
        .returning();

      if (updated) {
        console.log(`[mercadopago-webhook] Payment completed: ${updated.id}`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[mercadopago-webhook]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Webhook error' }, { status: 400 });
  }
}
