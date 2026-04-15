
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, payments } from '@quote-engine/db';
import { getAuthTenant } from '@/lib/auth';
import { getPaymentProvider } from '@quote-engine/payments';

const schema = z.object({
  amount: z.number().positive().max(999999),
  currency: z.string().length(3).default('MXN'),
  description: z.string().min(1).max(500),
  patientName: z.string().max(200).optional(),
  patientEmail: z.string().email().optional(),
  appointmentId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthTenant();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.errors }, { status: 400 });
    }

    const provider = getPaymentProvider(auth.tenant);
    if (!provider) {
      return NextResponse.json(
        { error: 'No payment provider configured. Go to Settings → Payments to set up Stripe or MercadoPago.' },
        { status: 422 }
      );
    }

    // Amount in cents for consistency
    const amountCents = Math.round(parsed.data.amount * 100);

    const link = await provider.createPaymentLink({
      tenantId: auth.tenant.id,
      amount: amountCents,
      currency: parsed.data.currency,
      description: parsed.data.description,
      patientName: parsed.data.patientName,
      patientEmail: parsed.data.patientEmail,
      appointmentId: parsed.data.appointmentId,
    });

    // Create a payment record in pending state
    const [payment] = await db
      .insert(payments)
      .values({
        tenantId: auth.tenant.id,
        amount: String(parsed.data.amount),
        method: provider.name,
        processor: provider.name,
        status: 'pending',
        externalId: link.externalId,
        description: parsed.data.description,
        patientName: parsed.data.patientName || null,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: {
        paymentId: payment.id,
        url: link.url,
        provider: link.provider,
        expiresAt: link.expiresAt?.toISOString(),
      },
    });
  } catch (err) {
    console.error('[create-payment-link]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Failed to create payment link' }, { status: 500 });
  }
}
