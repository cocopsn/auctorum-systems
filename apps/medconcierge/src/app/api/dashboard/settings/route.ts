export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@quote-engine/db'
import { tenants, doctors } from '@quote-engine/db'
import type { TenantConfig } from '@quote-engine/db'

async function getTenantId() {
  const [tenant] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, 'dra-martinez'))
    .limit(1)
  return tenant?.id
}

export async function GET() {
  const tenantId = await getTenantId()
  if (!tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 401 })

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1)
  const [doctor] = await db.select().from(doctors).where(eq(doctors.tenantId, tenantId)).limit(1)

  return NextResponse.json({ tenant, doctor })
}

export async function PUT(request: NextRequest) {
  const tenantId = await getTenantId()
  if (!tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 401 })

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
