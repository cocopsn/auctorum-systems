export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { constructWebhookEvent, STRIPE_PLANS } from "@quote-engine/payments";
import { db } from "@quote-engine/db";
import { sql } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = constructWebhookEvent(body, sig);
  } catch (err) {
    console.error("[Stripe Webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  console.log(`[Stripe Webhook] Event: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const tenantId = session.metadata?.tenant_id;
        const planId = session.metadata?.plan_id as keyof typeof STRIPE_PLANS | undefined;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (tenantId && planId && subscriptionId) {
          const plan = STRIPE_PLANS[planId];
          const amount = plan?.amount ?? 0;

          // Update or insert subscription
          await db.execute(sql`
            INSERT INTO subscriptions (tenant_id, plan, status, amount, currency, billing_cycle,
              payment_method, processor_subscription_id, stripe_customer_id,
              current_period_start, current_period_end, created_at, updated_at)
            VALUES (${tenantId}, ${planId}, active, ${amount}, MXN, monthly,
              stripe, ${subscriptionId}, ${customerId},
              NOW(), NOW() + INTERVAL 1 month, NOW(), NOW())
            ON CONFLICT (tenant_id) DO UPDATE SET
              plan = ${planId},
              status = active,
              amount = ${amount},
              payment_method = stripe,
              processor_subscription_id = ${subscriptionId},
              stripe_customer_id = ${customerId},
              current_period_start = NOW(),
              current_period_end = NOW() + INTERVAL 1 month,
              cancelled_at = NULL,
              updated_at = NOW()
          `);

          // Update tenant plan + status
          await db.execute(sql`
            UPDATE tenants SET
              plan = ${planId},
              provisioning_status = active,
              provisioned_at = NOW(),
              updated_at = NOW()
            WHERE id = ${tenantId}::uuid
          `);

          // Record payment
          await db.execute(sql`
            INSERT INTO payments (tenant_id, amount, currency, method, processor,
              processor_payment_id, status, reference, created_at)
            VALUES (${tenantId}::uuid, ${amount}, MXN, card, stripe,
              ${session.payment_intent || session.id}, completed,
              ${"Suscripción " + (plan?.name || planId)}, NOW())
          `);

          console.log(`[Stripe] Tenant ${tenantId} subscribed to ${planId}`);
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          // Find tenant by processor_subscription_id and renew period
          await db.execute(sql`
            UPDATE subscriptions SET
              status = active,
              current_period_start = NOW(),
              current_period_end = NOW() + INTERVAL 1 month,
              updated_at = NOW()
            WHERE processor_subscription_id = ${subscriptionId}
          `);

          // Record payment
          const rows = await db.execute(sql`
            SELECT tenant_id, amount FROM subscriptions
            WHERE processor_subscription_id = ${subscriptionId}
          `) as any[];

          if (rows[0]) {
            await db.execute(sql`
              INSERT INTO payments (tenant_id, amount, currency, method, processor,
                processor_payment_id, status, reference, created_at)
              VALUES (${rows[0].tenant_id}::uuid, ${rows[0].amount}, MXN, card, stripe,
                ${invoice.payment_intent || invoice.id}, completed,
                Renovación mensual, NOW())
            `);
          }

          console.log(`[Stripe] Invoice paid for subscription ${subscriptionId}`);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription as string;
        const attemptCount = invoice.attempt_count || 0;

        if (subscriptionId) {
          await db.execute(sql`
            UPDATE subscriptions SET
              status = past_due,
              updated_at = NOW()
            WHERE processor_subscription_id = ${subscriptionId}
          `);

          // After 3 failed attempts, suspend the tenant
          if (attemptCount >= 3) {
            await db.execute(sql`
              UPDATE tenants SET
                provisioning_status = suspended,
                updated_at = NOW()
              WHERE id = (
                SELECT tenant_id FROM subscriptions
                WHERE processor_subscription_id = ${subscriptionId}
              )
            `);
          }

          console.log(`[Stripe] Payment failed for ${subscriptionId}, attempt ${attemptCount}`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as any;
        const tenantId = subscription.metadata?.tenant_id;

        if (tenantId) {
          // Sync cancel_at_period_end status
          if (subscription.cancel_at_period_end) {
            console.log(`[Stripe] Subscription cancellation scheduled for tenant ${tenantId}`);
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        const tenantId = subscription.metadata?.tenant_id;

        if (tenantId) {
          await db.execute(sql`
            UPDATE subscriptions SET
              status = cancelled,
              cancelled_at = NOW(),
              updated_at = NOW()
            WHERE tenant_id = ${tenantId}::uuid
          `);

          await db.execute(sql`
            UPDATE tenants SET
              provisioning_status = suspended,
              updated_at = NOW()
            WHERE id = ${tenantId}::uuid
          `);

          console.log(`[Stripe] Subscription cancelled for tenant ${tenantId}`);
        }
        break;
      }
    }
  } catch (err) {
    console.error(`[Stripe Webhook] Error processing ${event.type}:`, err);
    // Return 200 anyway to prevent Stripe retries for processing errors
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
