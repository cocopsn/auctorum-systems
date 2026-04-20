export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAuthTenant } from "@/lib/auth";
import { createPortalSession } from "@quote-engine/payments";
import { db } from "@quote-engine/db";
import { sql } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const auth = await getAuthTenant();
  if (!auth) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    // Get stripe_customer_id from subscriptions
    const rows = await db.execute(sql`
      SELECT stripe_customer_id FROM subscriptions
      WHERE tenant_id = ${auth.tenant.id} AND stripe_customer_id IS NOT NULL
    `) as any[];

    const customerId = rows[0]?.stripe_customer_id;
    if (!customerId) {
      return NextResponse.json(
        { error: "No se encontró cliente de Stripe. Primero realiza un pago con tarjeta." },
        { status: 400 }
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://med.auctorum.com.mx";
    const session = await createPortalSession(
      customerId,
      `${siteUrl}/settings/subscription`
    );

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[Billing] Portal session error:", error);
    return NextResponse.json(
      { error: "Error al abrir portal de facturación" },
      { status: 500 }
    );
  }
}
