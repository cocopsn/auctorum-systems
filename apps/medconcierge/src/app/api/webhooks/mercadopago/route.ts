export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getMPPayment, verifyMPWebhook, STRIPE_PLANS } from "@quote-engine/payments";
import { db } from "@quote-engine/db";
import { sql } from "drizzle-orm";
import { creditAddon } from "@quote-engine/ai";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  const body = await req.json();

  // CRIT-01 FIX: Signature verification is now MANDATORY
  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");

  if (!xSignature || !xRequestId) {
    console.error("[MP Webhook] Missing x-signature or x-request-id header");
    return NextResponse.json(
      { error: "Missing required signature headers" },
      { status: 400 }
    );
  }

  if (body.type === "payment" && body.data?.id) {
    const valid = verifyMPWebhook(xSignature, xRequestId, String(body.data.id));
    if (!valid) {
      console.error("[MP Webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    try {
      const payment = await getMPPayment(String(body.data.id));

      if (payment.status === "approved") {
        // Safe-parse external_reference
        let extRef: Record<string, unknown>;
        try {
          extRef = JSON.parse(
            (payment as any).external_reference || "{}"
          );
        } catch (parseErr) {
          console.error("[MP Webhook] Malformed external_reference:", parseErr);
          return NextResponse.json(
            { error: "Malformed external_reference" },
            { status: 400 }
          );
        }

        const tenantId = extRef.tenant_id as string | undefined;
        const planIdRaw = extRef.plan_id as string | undefined;

        // Validate tenant_id is a proper UUID before using in SQL
        if (tenantId && !UUID_RE.test(tenantId)) {
          console.error("[MP Webhook] Invalid tenant_id format:", tenantId);
          return NextResponse.json(
            { error: "Invalid tenant_id format" },
            { status: 400 }
          );
        }

        // ── Add-on purchase: plan_id starts with "addon-<packageId>" ──────
        // Crediting is idempotent on (processor, externalPaymentId) so duplicate
        // webhook deliveries don't double-grant.
        if (tenantId && planIdRaw && planIdRaw.startsWith('addon-')) {
          const packageId = planIdRaw.slice('addon-'.length);
          try {
            const result = await creditAddon({
              tenantId,
              packageId,
              paymentProcessor: 'mercadopago',
              externalPaymentId: String((payment as any).id),
            });
            console.log(
              `[MP] Tenant ${tenantId} purchased addon ${packageId} (${result.created ? 'credited' : 'duplicate'})`,
            );
          } catch (addonErr) {
            console.error(`[MP] Addon credit failed for ${tenantId}/${packageId}:`, addonErr);
          }
          return NextResponse.json({ received: true, kind: 'addon' }, { status: 200 });
        }

        const planId = planIdRaw as keyof typeof STRIPE_PLANS | undefined;
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
