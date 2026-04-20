export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getMPPayment, verifyMPWebhook, STRIPE_PLANS } from "@quote-engine/payments";
import { db } from "@quote-engine/db";
import { sql } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Verify signature
  const xSignature = req.headers.get("x-signature") || "";
  const xRequestId = req.headers.get("x-request-id") || "";

  if (body.type === "payment" && body.data?.id) {
    if (xSignature && xRequestId) {
      const valid = verifyMPWebhook(xSignature, xRequestId, String(body.data.id));
      if (!valid) {
        console.error("[MP Webhook] Invalid signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
      }
    }

    try {
      const payment = await getMPPayment(String(body.data.id));

      if (payment.status === "approved") {
        const extRef = JSON.parse(
          (payment as any).external_reference || "{}"
        );
        const tenantId = extRef.tenant_id;
        const planId = extRef.plan_id as keyof typeof STRIPE_PLANS | undefined;

        if (tenantId && planId) {
          const plan = STRIPE_PLANS[planId];
          const amount = plan?.amount ?? (payment as any).transaction_amount ?? 0;

          // Update or insert subscription
          await db.execute(sql`
            INSERT INTO subscriptions (tenant_id, plan, status, amount, currency, billing_cycle,
              payment_method, current_period_start, current_period_end, created_at, updated_at)
            VALUES (${tenantId}, ${planId}, 'active', ${amount}, 'MXN', 'monthly',
              'mercadopago', NOW(), NOW() + INTERVAL '1 month', NOW(), NOW())
            ON CONFLICT (tenant_id) DO UPDATE SET
              plan = ${planId},
              status = 'active',
              amount = ${amount},
              payment_method = 'mercadopago',
              current_period_start = NOW(),
              current_period_end = NOW() + INTERVAL '1 month',
              cancelled_at = NULL,
              updated_at = NOW()
          `);

          // Update tenant plan
          await db.execute(sql`
            UPDATE tenants SET
              plan = ${planId},
              provisioning_status = 'active',
              provisioned_at = NOW(),
              updated_at = NOW()
            WHERE id = ${tenantId}::uuid
          `);

          // Record payment
          const refLabel = 'Suscripcion ' + (plan?.name || planId) + ' via MercadoPago';
          await db.execute(sql`
            INSERT INTO payments (tenant_id, amount, currency, method, processor,
              processor_payment_id, status, reference, created_at)
            VALUES (${tenantId}::uuid, ${amount}, 'MXN',
              ${(payment as any).payment_type_id || 'other'}, 'mercadopago',
              ${String((payment as any).id)}, 'completed',
              ${refLabel}, NOW())
          `);

          console.log(`[MP] Tenant ${tenantId} paid ${planId} via MercadoPago`);
        }
      }
    } catch (err) {
      console.error("[MP Webhook] Error:", err);
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
