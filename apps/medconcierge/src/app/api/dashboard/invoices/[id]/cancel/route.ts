export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getAuthTenant } from "@/lib/auth"
import { db, invoices } from "@quote-engine/db"
import { eq, and, sql } from "drizzle-orm"
import { validateOrigin } from "@/lib/csrf"
import Facturapi from "facturapi"

// ---------------------------------------------------------------------------
// POST /api/dashboard/invoices/[id]/cancel — Cancelar factura via Facturapi
// ---------------------------------------------------------------------------
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!validateOrigin(request))
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 })

  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, params.id), eq(invoices.tenantId, auth.tenant.id)))
    .limit(1)

  if (!invoice)
    return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 })

  if (invoice.status !== "stamped")
    return NextResponse.json({ error: "Solo se pueden cancelar facturas timbradas" }, { status: 400 })

  // Get tenant Facturapi config
  const [tenant] = await db.execute(
    sql`SELECT "invoiceConfig" FROM tenants WHERE id = ${auth.tenant.id}`
  )

  const config = (tenant as any)?.invoiceConfig
  if (!config?.facturapiApiKey || !invoice.cfdiUuid) {
    return NextResponse.json({ error: "Facturapi no configurado o factura sin UUID" }, { status: 400 })
  }

  try {
    const facturapi = new Facturapi(config.facturapiApiKey)
    await facturapi.invoices.cancel(invoice.cfdiUuid, { motive: "02" }) // 02 = Comprobante emitido con errores

    const [updated] = await db
      .update(invoices)
      .set({ status: "cancelled" })
      .where(eq(invoices.id, params.id))
      .returning()

    return NextResponse.json({ invoice: updated })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Error al cancelar con Facturapi" },
      { status: 500 }
    )
  }
}
