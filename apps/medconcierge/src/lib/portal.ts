import { cache } from 'react'
import { and, eq } from 'drizzle-orm'
import { db, patients, tenants } from '@quote-engine/db'
import type { Patient, Tenant } from '@quote-engine/db'

// ============================================================
// Portal token validation + URL builder.
// Patients access their read-only portal via a unique UUID token.
// getPortalPatient validates the token against a tenant slug in
// one query, cached per-request via React cache().
// ============================================================

export const getPortalPatient = cache(async (
  slug: string,
  token: string,
): Promise<{ patient: Patient; tenant: Tenant } | null> => {
  const rows = await db
    .select({ patient: patients, tenant: tenants })
    .from(patients)
    .innerJoin(tenants, eq(patients.tenantId, tenants.id))
    .where(and(
      eq(patients.portalToken, token),
      eq(tenants.slug, slug),
      eq(tenants.isActive, true),
    ))
    .limit(1)

  if (rows.length === 0) return null
  return { patient: rows[0].patient, tenant: rows[0].tenant }
})

export function buildPortalUrl(slug: string, portalToken: string): string {
  const domain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'auctorum.com.mx'
  return `https://${slug}.${domain}/portal/${portalToken}`
}
