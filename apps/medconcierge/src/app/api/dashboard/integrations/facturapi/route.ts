export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getAuthTenant } from "@/lib/auth"
import { db, tenants } from "@quote-engine/db"
import { eq } from "drizzle-orm"
import { validateOrigin } from "@/lib/csrf"
import Facturapi from "facturapi"

// ---------------------------------------------------------------------------
// GET /api/dashboard/integrations/facturapi — Check connection status
// ---------------------------------------------------------------------------
export async function GET() {
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Drizzle-typed select. Pre-2026-05-10 this used raw SQL with the
  // schema-field name `"invoiceConfig"` quoted which Postgres looks up
  // case-sensitively as a column that doesn't exist (the real column is
  // snake_case `invoice_config`). Every GET 500'd. Drizzle's typed select
  // takes the camelCase field and emits the correct column under the hood.
  const [tenant] = await db
    .select({ invoiceConfig: tenants.invoiceConfig })
    .from(tenants)
    .where(eq(tenants.id, auth.tenant.id))
    .limit(1)

  const config = (tenant?.invoiceConfig ?? {}) as Record<string, any>
  if (!config?.facturapiApiKey) {
    return NextResponse.json({ connected: false })
  }

  try {
    const facturapi = new Facturapi(config.facturapiApiKey)
    const org = await facturapi.organizations.getOrganization()

    return NextResponse.json({
      connected: true,
      organization: {
        legal_name: org.legal_name,
        tax_id: org.tax_id,
        tax_system: org.tax_system,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ connected: false, error: err.message })
  }
}

// ---------------------------------------------------------------------------
// POST /api/dashboard/integrations/facturapi — Verify API key
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  if (!validateOrigin(request))
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 })

  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { apiKey } = body

  if (!apiKey) {
    return NextResponse.json({ error: "API key requerida" }, { status: 400 })
  }

  try {
    const facturapi = new Facturapi(apiKey)
    const org = await facturapi.organizations.getOrganization()

    return NextResponse.json({
      valid: true,
      organization: {
        legal_name: org.legal_name,
        tax_id: org.tax_id,
        tax_system: org.tax_system,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ valid: false, error: err.message }, { status: 400 })
  }
}
