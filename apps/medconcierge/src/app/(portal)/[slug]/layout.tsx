import { notFound } from 'next/navigation'
import { getTenant, getTenantConfig, tenantCssVars, getDoctor } from '@/lib/tenant'
import { PortalHeader } from '@/components/portal/portal-header'
import { PortalFooter } from '@/components/portal/portal-footer'

export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { slug: string }
}) {
  const tenant = await getTenant(params.slug)
  if (!tenant) notFound()

  const config = getTenantConfig(tenant)
  const doctor = await getDoctor(tenant.id)
  if (!doctor) notFound()

  const cssVars = tenantCssVars(config)

  return (
    <div style={cssVars as React.CSSProperties} className="min-h-screen bg-[var(--bg-primary)]">
      <PortalHeader doctorName={tenant.name} specialty={doctor.specialty} />
      <main>{children}</main>
      <PortalFooter contact={config.contact} />
    </div>
  )
}
