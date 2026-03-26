export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@quote-engine/db'
import { tenants, doctors } from '@quote-engine/db'
import type { TenantConfig } from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'

export async function GET() {
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenantId = auth.tenant.id

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1)
  const [doctor] = await db.select().from(doctors).where(eq(doctors.tenantId, tenantId)).limit(1)

  return NextResponse.json({ tenant, doctor })
}

export async function PUT(request: NextRequest) {
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenantId = auth.tenant.id

  try {
    const body = await request.json()
    const { config, doctorProfile } = body

    if (config) {
      await db
        .update(tenants)
        .set({ config, updatedAt: new Date() })
        .where(eq(tenants.id, tenantId))
    }

    if (doctorProfile) {
      await db
        .update(doctors)
        .set(doctorProfile)
        .where(eq(doctors.tenantId, tenantId))
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Settings update error:', error)
    return NextResponse.json({ error: 'Error updating settings' }, { status: 500 })
  }
}
