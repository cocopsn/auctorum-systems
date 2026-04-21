export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAuthTenant } from "@/lib/auth";
import { createCheckoutSession, type PlanId } from "@quote-engine/payments";
import { validateOrigin } from "@/lib/csrf";

export async function POST(req: NextRequest) {
  if (!validateOrigin(req)) return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });

  const auth = await getAuthTenant();
  if (!auth) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { planId } = await req.json();

  if (!["basico", "auctorum"].includes(planId)) {
    return NextResponse.json({ error: "Plan inválido" }, { status: 400 });
  }

  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://med.auctorum.com.mx";
    const session = await createCheckoutSession({
      tenantId: auth.tenant.id,
      planId: planId as PlanId,
      customerEmail: auth.user.email,
      successUrl: `${siteUrl}/settings/subscription?success=true`,
      cancelUrl: `${siteUrl}/settings/subscription?cancelled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[Billing] Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Error al crear sesión de pago" },
      { status: 500 }
    );
  }
}
