import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import crypto from "crypto";
import { timingSafeEqual } from "crypto";

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

const mpPreference = new Preference(mpClient);
const mpPayment = new Payment(mpClient);

export { mpPreference, mpPayment };

// ---------------------------------------------------------------------------
// Create MercadoPago payment preference (one-time for monthly plan)
// ---------------------------------------------------------------------------

export async function createMPPreference(params: {
  tenantId: string;
  planId: string;
  planName: string;
  amount: number;
  payerEmail: string;
  successUrl: string;
  failureUrl: string;
  pendingUrl: string;
  webhookUrl: string;
}) {
  const preference = await mpPreference.create({
    body: {
      items: [
        {
          id: `plan-${params.planId}`,
          title: `Auctorum Med - ${params.planName}`,
          description: `Suscripción mensual ${params.planName}`,
          quantity: 1,
          unit_price: params.amount,
          currency_id: "MXN",
        },
      ],
      payer: { email: params.payerEmail },
      back_urls: {
        success: params.successUrl,
        failure: params.failureUrl,
        pending: params.pendingUrl,
      },
      auto_return: "approved",
      notification_url: params.webhookUrl,
      external_reference: JSON.stringify({
        tenant_id: params.tenantId,
        plan_id: params.planId,
      }),
      statement_descriptor: "AUCTORUM MED",
    },
  });

  return preference;
}

// ---------------------------------------------------------------------------
// Get payment details by ID
// ---------------------------------------------------------------------------

export async function getMPPayment(paymentId: string) {
  return mpPayment.get({ id: paymentId });
}

// ---------------------------------------------------------------------------
// Verify webhook signature using HMAC
// ---------------------------------------------------------------------------

/**
 * Verify a MercadoPago webhook (HMAC + timestamp freshness).
 *
 * Algorithm (per MP docs):
 *   manifest = `id:${data.id};request-id:${x-request-id};ts:${ts};`
 *   v1       = HMAC_SHA256(MERCADOPAGO_CLIENT_SECRET, manifest)
 *   x-signature header = "ts=<unixms>,v1=<hex>"
 *
 * MP itself does NOT enforce a freshness window on `ts`, which means a
 * captured-and-replayed valid v1 was accepted FOREVER until this commit.
 * We add a 5-minute tolerance (matching Stripe's defaults) so a leaked
 * webhook payload can't be replayed weeks later.
 *
 * `MAX_SKEW_MS` is configurable via env if a tenant ever needs to relax
 * the window for a flaky network — but the default is the right tradeoff.
 */
const DEFAULT_MAX_SKEW_MS = 5 * 60_000

export function verifyMPWebhook(
  xSignature: string,
  xRequestId: string,
  dataId: string,
  options: { maxSkewMs?: number; nowMs?: number } = {}
): boolean {
  if (!xSignature || !xRequestId || !dataId) return false

  const parts = xSignature.split(",")
  let ts = ""
  let hash = ""
  for (const part of parts) {
    const [key, val] = part.trim().split("=")
    if (key === "ts") ts = val
    if (key === "v1") hash = val
  }
  if (!ts || !hash) return false

  // Replay-attack mitigation: reject signatures whose ts is older than
  // maxSkewMs (default 5min). MP sends ts in milliseconds.
  const tsMs = Number.parseInt(ts, 10)
  if (!Number.isFinite(tsMs) || tsMs <= 0) return false
  const now = options.nowMs ?? Date.now()
  const skew = options.maxSkewMs ?? DEFAULT_MAX_SKEW_MS
  if (Math.abs(now - tsMs) > skew) return false

  const secret = process.env.MERCADOPAGO_CLIENT_SECRET
  if (!secret) return false

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex")
  const expectedBuf = Buffer.from(expected, "hex")
  const hashBuf = Buffer.from(hash, "hex")
  if (expectedBuf.length !== hashBuf.length) return false
  return timingSafeEqual(expectedBuf, hashBuf)
}
