export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAuthTenant } from "@/lib/auth";
import { createMPPreference, STRIPE_PLANS } from "@quote-engine/payments";
import { validateOrigin } from "@/lib/csrf";

export async function POST(req: NextRequest) {
  if (!validateOrigin(req)) return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });

  const auth = await getAuthTenant();
  if (!auth) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { planId } = await req.json();

  const plan = STRIPE_PLANS[planId as keyof typeof STRIPE_PLANS];
  if (!plan) {
    return NextResponse.json({ error: "Plan inválido" }, { status: 400 });
  }

  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://med.auctorum.com.mx";
    const preference = await createMPPreference({
      tenantId: auth.tenant.id,
      planId,
      planName: plan.name,
      amount: plan.amount,
      payerEmail: auth.user.email,
      successUrl: `${siteUrl}/settings/subscription?success=true`,
      failureUrl: `${siteUrl}/settings/subscription?failed=true`,
      pendingUrl: `${siteUrl}/settings/subscription?pending=true`,
      webhookUrl: `${siteUrl}/api/webhooks/mercadopago`,
    });

    return NextResponse.json({ url: preference.init_point });
  } catch (error) {
    console.error("[Billing] MercadoPago checkout error:", error);
    return NextResponse.json(
      { error: "Error al crear preferencia de pago" },
      { status: 500 }
    );
  }
}
