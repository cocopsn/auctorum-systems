export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { constructWebhookEvent, STRIPE_PLANS } from "@quote-engine/payments";
import { db } from "@quote-engine/db";
import { sql } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  // Internal retry path: cron-webhook-retries replays a stored payload via
  // a shared secret because the original Stripe signature is no longer
  // valid (timestamp would be stale). The handler does the same work it
  // would on a fresh delivery; idempotency keys (subscription id, payment
  // intent id) make duplicates safe.
  const retrySecret = req.headers.get('x-auctorum-retry-secret')
  const isInternalRetry =
    !!process.env.WEBHOOK_RETRY_SECRET &&
    retrySecret === process.env.WEBHOOK_RETRY_SECRET &&
    req.headers.get('x-auctorum-retry') === '1'

  let event;
  if (isInternalRetry) {
    try {
      event = JSON.parse(body)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON on retry' }, { status: 400 });
    }
  } else {
    if (!sig) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }
    try {
      event = constructWebhookEvent(body, sig);
    } catch (err) {
      console.error("[Stripe Webhook] Signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }
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

        // ─── Add-on pack purchase (extra WhatsApp / API / storage capacity) ───
        // Sessions created with metadata.type='addon_purchase' and
        // metadata.package_id='whatsapp_500' etc. creditAddon is idempotent
        // by (processor, externalPaymentId) so a duplicate webhook delivery
        // does not double-credit.
        if (session.metadata?.type === 'addon_purchase' && tenantId && session.metadata.package_id) {
          try {
            const { creditAddon } = await import('@quote-engine/ai')
            const result = await creditAddon({
              tenantId,
              packageId: String(session.metadata.package_id),
              paymentProcessor: 'stripe',
              externalPaymentId: session.id,
            })
            console.log(
              `[Stripe Addon] tenant=${tenantId} package=${session.metadata.package_id} ${result.created ? 'credited' : 'duplicate'}`,
            )
          } catch (err) {
            console.error(`[Stripe Addon] credit failed for tenant=${tenantId}:`, err)
          }
          break;
        }

        // ─── Patient payment (Stripe Connect destination charge) ───
        // These sessions don't have a planId; their type metadata is set
        // to 'patient_payment' when we created them in patient-payments/checkout.
        if (session.metadata?.type === 'patient_payment') {
          const piId = typeof session.payment_intent === 'string'
            ? session.payment_intent
            : null
          await db.execute(sql`
            UPDATE patient_payments
            SET status = 'succeeded',
                stripe_payment_intent_id = COALESCE(stripe_payment_intent_id, ${piId}),
                payment_method = COALESCE(${(session.payment_method_types?.[0] as string) ?? null}, payment_method),
                updated_at = NOW()
            WHERE stripe_checkout_session_id = ${session.id}
              AND status IN ('pending', 'processing')
          `);
          console.log(
            `[Stripe Connect] patient_payment session=${session.id} tenant=${tenantId} status=succeeded`,
          );
          break;
        }

        if (tenantId && planId && subscriptionId) {
          const plan = STRIPE_PLANS[planId];
          const amount = plan?.amount ?? 0;

          // Update or insert subscription. All string literals MUST be
          // quoted ('active', 'MXN', 'monthly', 'stripe') and intervals
          // need their unit quoted (INTERVAL '1 month'). Pre-2026-05-10 the
          // SQL had bare words and Postgres rejected the whole INSERT —
          // every paid Stripe checkout silently 500'd and no tenant got
          // marked active. The MercadoPago webhook had the same shape
          // quoted correctly; this matches that style now.
          await db.execute(sql`
            INSERT INTO subscriptions (tenant_id, plan, status, amount, currency, billing_cycle,
              payment_method, processor_subscription_id, stripe_customer_id,
              current_period_start, current_period_end, created_at, updated_at)
            VALUES (${tenantId}::uuid, ${planId}, 'active', ${amount}, 'MXN', 'monthly',
              'stripe', ${subscriptionId}, ${customerId},
              NOW(), NOW() + INTERVAL '1 month', NOW(), NOW())
            ON CONFLICT (tenant_id) DO UPDATE SET
              plan = ${planId},
              status = 'active',
              amount = ${amount},
              payment_method = 'stripe',
              processor_subscription_id = ${subscriptionId},
              stripe_customer_id = ${customerId},
              current_period_start = NOW(),
              current_period_end = NOW() + INTERVAL '1 month',
              cancelled_at = NULL,
              updated_at = NOW()
          `);

          // Update tenant plan + status
          await db.execute(sql`
            UPDATE tenants SET
              plan = ${planId},
              provisioning_status = 'active',
              provisioned_at = NOW(),
              updated_at = NOW()
            WHERE id = ${tenantId}::uuid
          `);

          // Record payment
          await db.execute(sql`
            INSERT INTO payments (tenant_id, amount, currency, method, processor,
              processor_payment_id, status, reference, created_at)
            VALUES (${tenantId}::uuid, ${amount}, 'MXN', 'card', 'stripe',
              ${session.payment_intent || session.id}, 'completed',
              ${"Suscripción " + (plan?.name || planId)}, NOW())
          `);

          console.log(`[Stripe] Tenant ${tenantId} subscribed to ${planId}`);

          // If this was a signup checkout, send magic link for login
          if (session.metadata?.signup === 'true') {
            console.log(`[Stripe] Signup checkout completed for tenant ${tenantId}`);
          }
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
              status = 'active',
              current_period_start = NOW(),
              current_period_end = NOW() + INTERVAL '1 month',
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
              VALUES (${rows[0].tenant_id}::uuid, ${rows[0].amount}, 'MXN', 'card', 'stripe',
                ${invoice.payment_intent || invoice.id}, 'completed',
                'Renovación mensual', NOW())
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
              status = 'past_due',
              updated_at = NOW()
            WHERE processor_subscription_id = ${subscriptionId}
          `);

          // After 3 failed attempts, suspend the tenant
          if (attemptCount >= 3) {
            await db.execute(sql`
              UPDATE tenants SET
                provisioning_status = 'suspended',
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
              status = 'cancelled',
              cancelled_at = NOW(),
              updated_at = NOW()
            WHERE tenant_id = ${tenantId}::uuid
          `);

          await db.execute(sql`
            UPDATE tenants SET
              provisioning_status = 'suspended',
              updated_at = NOW()
            WHERE id = ${tenantId}::uuid
          `);

          console.log(`[Stripe] Subscription cancelled for tenant ${tenantId}`);
        }
        break;
      }

      // ─── Patient payment events (Stripe Connect destination charges) ───

      case "payment_intent.succeeded": {
        const pi = event.data.object as any;
        if (pi.metadata?.type === 'patient_payment') {
          const charges = pi.charges?.data as Array<any> | undefined;
          const charge = charges?.[0];
          await db.execute(sql`
            UPDATE patient_payments
            SET status = 'succeeded',
                stripe_charge_id = ${charge?.id ?? null},
                receipt_url = ${charge?.receipt_url ?? null},
                payment_method = COALESCE(${charge?.payment_method_details?.type ?? null}, payment_method),
                updated_at = NOW()
            WHERE stripe_payment_intent_id = ${pi.id}
          `);
          console.log(`[Stripe Connect] payment_intent.succeeded ${pi.id}`);
        }
        break;
      }

      case "payment_intent.payment_failed":
      case "payment_intent.canceled": {
        const pi = event.data.object as any;
        if (pi.metadata?.type === 'patient_payment') {
          const reason =
            pi.last_payment_error?.message || pi.cancellation_reason || `${event.type}`;
          await db.execute(sql`
            UPDATE patient_payments
            SET status = ${event.type === 'payment_intent.canceled' ? 'cancelled' : 'failed'},
                failure_reason = ${reason},
                updated_at = NOW()
            WHERE stripe_payment_intent_id = ${pi.id}
          `);
          console.log(`[Stripe Connect] ${event.type} ${pi.id}: ${reason}`);
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as any;
        if (charge.metadata?.type === 'patient_payment' || charge.transfer_data?.destination) {
          await db.execute(sql`
            UPDATE patient_payments
            SET status = 'refunded',
                updated_at = NOW()
            WHERE stripe_charge_id = ${charge.id}
          `);
          console.log(`[Stripe Connect] charge.refunded ${charge.id}`);
        }
        break;
      }

      // ─── Connect account lifecycle ───
      case "account.updated": {
        const account = event.data.object as any;
        // Mirror status changes to the tenant row so the UI badge stays fresh.
        const status =
          account.charges_enabled && account.payouts_enabled
            ? 'active'
            : account.details_submitted
            ? 'restricted'
            : 'pending';
        await db.execute(sql`
          UPDATE tenants
          SET stripe_connect_status = ${status},
              stripe_connect_onboarded_at = CASE
                WHEN ${status} = 'active' AND stripe_connect_onboarded_at IS NULL THEN NOW()
                ELSE stripe_connect_onboarded_at
              END,
              updated_at = NOW()
          WHERE stripe_connect_account_id = ${account.id}
        `);
        console.log(`[Stripe Connect] account.updated ${account.id} -> ${status}`);
        break;
      }
    }
  } catch (err) {
    console.error(`[Stripe Webhook] Error processing ${event.type}:`, err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
