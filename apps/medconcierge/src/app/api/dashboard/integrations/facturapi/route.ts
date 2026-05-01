export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getAuthTenant } from "@/lib/auth"
import { db } from "@quote-engine/db"
import { sql } from "drizzle-orm"
import { validateOrigin } from "@/lib/csrf"
import Facturapi from "facturapi"

// ---------------------------------------------------------------------------
// GET /api/dashboard/integrations/facturapi — Check connection status
// ---------------------------------------------------------------------------
export async function GET() {
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [tenant] = await db.execute(
    sql`SELECT "invoiceConfig" FROM tenants WHERE id = ${auth.tenant.id}`
  )

  const config = (tenant as any)?.invoiceConfig
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
