export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getAuthTenant } from "@/lib/auth"
import { db, invoices } from "@quote-engine/db"
import { eq, and, sql } from "drizzle-orm"
import Facturapi from "facturapi"

// ---------------------------------------------------------------------------
// GET /api/dashboard/invoices/[id]/pdf — Download PDF from Facturapi
// ---------------------------------------------------------------------------
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, params.id), eq(invoices.tenantId, auth.tenant.id)))
    .limit(1)

  if (!invoice)
    return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 })

  if (!invoice.cfdiUuid)
    return NextResponse.json({ error: "Factura no timbrada" }, { status: 400 })

  const [tenant] = await db.execute(
    sql`SELECT "invoiceConfig" FROM tenants WHERE id = ${auth.tenant.id}`
  )

  const config = (tenant as any)?.invoiceConfig
  if (!config?.facturapiApiKey)
    return NextResponse.json({ error: "Facturapi no configurado" }, { status: 400 })

  try {
    const facturapi = new Facturapi(config.facturapiApiKey)
    const pdfStream = await facturapi.invoices.downloadPdf(invoice.cfdiUuid)
    const chunks: Buffer[] = []
    for await (const chunk of pdfStream as any) {
      chunks.push(Buffer.from(chunk))
    }
    const pdfBuffer = Buffer.concat(chunks)

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoice.folio}.pdf"`,
      },
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Error al descargar PDF" },
      { status: 500 }
    )
  }
}
