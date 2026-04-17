import { NextResponse } from 'next/server'
import { db, tenants, type TenantConfig } from '@quote-engine/db'
import { eq } from 'drizzle-orm'
import { getAuthTenant } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const config = auth.tenant.config as TenantConfig

    return NextResponse.json({
      tenantSlug: auth.tenant.slug,
      tenantName: auth.tenant.name,
      logoUrl: auth.tenant.logoUrl ?? '',
      config,
    })
  } catch (err: any) {
    console.error('Settings tenant GET error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
