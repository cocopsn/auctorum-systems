import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import crypto from "crypto";

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

export function verifyMPWebhook(
  xSignature: string,
  xRequestId: string,
  dataId: string
): boolean {
  const parts = xSignature.split(",");
  let ts = "";
  let hash = "";
  for (const part of parts) {
    const [key, val] = part.trim().split("=");
    if (key === "ts") ts = val;
    if (key === "v1") hash = val;
  }
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const expected = crypto
    .createHmac("sha256", process.env.MERCADOPAGO_CLIENT_SECRET!)
    .update(manifest)
    .digest("hex");
  return expected === hash;
}
