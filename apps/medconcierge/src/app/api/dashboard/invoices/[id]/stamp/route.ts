export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getAuthTenant } from "@/lib/auth"
import { db, invoices, tenants } from "@quote-engine/db"
import { eq, and, sql } from "drizzle-orm"
import { validateOrigin } from "@/lib/csrf"
import Facturapi from "facturapi"

// ---------------------------------------------------------------------------
// POST /api/dashboard/invoices/[id]/stamp — Timbrar factura via Facturapi
// ---------------------------------------------------------------------------
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!validateOrigin(request))
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 })

  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Get invoice
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, params.id), eq(invoices.tenantId, auth.tenant.id)))
    .limit(1)

  if (!invoice)
    return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 })

  if (invoice.status === "stamped")
    return NextResponse.json({ error: "Factura ya timbrada" }, { status: 400 })

  // Get tenant Facturapi config
  const [tenant] = await db.execute(
    sql`SELECT "invoiceConfig" FROM tenants WHERE id = ${auth.tenant.id}`
  )

  const config = (tenant as any)?.invoiceConfig
  if (!config?.facturapiApiKey) {
    return NextResponse.json(
      { error: "Facturapi no configurado. Ve a Configuracion > Facturacion para ingresar tu API Key." },
      { status: 400 }
    )
  }

  try {
    const facturapi = new Facturapi(config.facturapiApiKey)

    // Build Facturapi invoice payload
    const facturapiInvoice = await facturapi.invoices.create({
      type: "I", // Ingreso
      customer: {
        legal_name: invoice.razonSocial,
        tax_id: invoice.rfc,
        tax_system: invoice.regimenFiscal,
        email: invoice.email,
        address: { zip: invoice.cpZip },
      },
      items: [
        {
          product: {
            description: `Servicios medicos - ${invoice.folio}`,
            product_key: "86101700", // Servicios de consulta medica
            price: Number(invoice.subtotal),
          },
          quantity: 1,
        },
      ],
      use: invoice.usoCfdi || "G03",
      payment_form: "03", // Transferencia electronica
      folio_number: parseInt(invoice.folio.replace(/\D/g, "")) || undefined,
    })

    // Update invoice with Facturapi data
    const [updated] = await db
      .update(invoices)
      .set({
        status: "stamped",
        cfdiUuid: facturapiInvoice.uuid,
        cfdiXmlUrl: facturapiInvoice.xml_url || null,
        pdfUrl: facturapiInvoice.pdf_custom_section || null,
        stampedAt: new Date(),
        errorMessage: null,
      })
      .where(eq(invoices.id, params.id))
      .returning()

    return NextResponse.json({ invoice: updated, facturapi: { uuid: facturapiInvoice.uuid } })
  } catch (err: any) {
    // Save error to DB
    await db
      .update(invoices)
      .set({ status: "error", errorMessage: err.message || "Error al timbrar" })
      .where(eq(invoices.id, params.id))

    return NextResponse.json(
      { error: err.message || "Error al timbrar con Facturapi" },
      { status: 500 }
    )
  }
}
