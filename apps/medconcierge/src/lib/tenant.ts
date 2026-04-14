import { cache } from 'react'
import { eq, or } from 'drizzle-orm'
import { db, tenants, doctors } from '@quote-engine/db'
import type { Tenant, Doctor } from '@quote-engine/db'

// Re-export client-safe utilities for backward compatibility
export { getTenantConfig, tenantCssVars, formatPhone, formatCurrency } from './utils'

export const getTenant = cache(async (slug: string): Promise<Tenant | null> => {
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(or(eq(tenants.slug, slug), eq(tenants.publicSubdomain, slug)))
    .limit(1)

  if (!tenant || !tenant.isActive) return null
  return tenant
})

export const getDoctor = cache(async (tenantId: string): Promise<Doctor | null> => {
  const [doctor] = await db
    .select()
    .from(doctors)
    .where(eq(doctors.tenantId, tenantId))
    .limit(1)

  return doctor ?? null
})
