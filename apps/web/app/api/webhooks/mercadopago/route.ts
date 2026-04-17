export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, payments } from '@quote-engine/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const data = JSON.parse(body);

    if (data.type !== 'payment') {
      return NextResponse.json({ received: true });
    }

    console.log(`[mercadopago-webhook] Payment notification: ${data.data?.id}`);

    if (data.data?.id) {
      const [updated] = await db
        .update(payments)
        .set({
          status: 'completed',
          paidAt: new Date(),
        })
        .where(eq(payments.processorPaymentId, String(data.data.id)))
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
