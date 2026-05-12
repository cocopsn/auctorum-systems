// `force-dynamic` + `revalidate=0` — sin esto Next 14 puede cachear la
// página pública del portal y los cambios del editor del dashboard no
// se ven hasta que expire el cache (o nunca, si la build se renderizó
// estática). 2026-05-11: confirmado que sin esto las ediciones del
// dashboard tardaban hasta varios minutos en reflejarse.
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { notFound } from 'next/navigation'
import { eq, and } from 'drizzle-orm'
import { getTenant, getTenantConfig, getDoctor } from '@/lib/tenant'
import { db, portalPages, schedules } from '@quote-engine/db'
import { DoctorProfile } from '@/components/portal/doctor-profile'
import { PortalRenderer } from '@/components/portal/portal-public-sections'
import type { PortalSection, PortalConfig } from '@quote-engine/db'

export default async function PortalPage({
  params,
}: {
  params: { slug: string }
}) {
  const tenant = await getTenant(params.slug)
  if (!tenant) notFound()

  const config = getTenantConfig(tenant)
  const doctor = await getDoctor(tenant.id)
  if (!doctor) notFound()

  // Check for custom portal pages
  const [portalPage] = await db
    .select()
    .from(portalPages)
    .where(
      and(
        eq(portalPages.tenantId, tenant.id),
        eq(portalPages.isHomepage, true),
        eq(portalPages.published, true)
      )
    )
    .limit(1)

  // If portal page exists with sections, render custom portal
  if (portalPage && (portalPage.sections as any[])?.length > 0) {
    const sections = portalPage.sections as PortalSection[]
    const portalConfig = (portalPage.portalConfig || {}) as PortalConfig

    return (
      <PortalRenderer
        sections={sections}
        config={portalConfig}
        tenantName={tenant.name}
      />
    )
  }

  // Fallback: render the default doctor profile
  const doctorSchedules = await db
    .select()
    .from(schedules)
    .where(eq(schedules.tenantId, tenant.id))
    .orderBy(schedules.dayOfWeek)

  return (
    <DoctorProfile
      doctor={doctor}
      config={config}
      schedules={doctorSchedules}
      slug={params.slug}
    />
  )
}
