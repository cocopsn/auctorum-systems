import { Sidebar } from '@/components/dashboard/sidebar'
import { getTenantConfig, tenantCssVars } from '@/lib/tenant'
import { ToastContainer } from '@/components/ui/Toast'

import { eq } from 'drizzle-orm'
import { db } from '@quote-engine/db'
import { tenants } from '@quote-engine/db'

async function getDemoTenant() {
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, 'dra-martinez'))
    .limit(1)
  return tenant
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const tenant = await getDemoTenant()

  if (!tenant) {
    return <div className="p-8 text-[var(--error)]">Tenant not found. Run seed first.</div>
  }

  const config = getTenantConfig(tenant)
  const cssVars = tenantCssVars(config)

  return (
    <div style={cssVars as React.CSSProperties} className="min-h-screen bg-[var(--bg-primary)]">
      <Sidebar doctorName={tenant.name} />
      <main className="lg:ml-56 min-h-screen">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
      <ToastContainer />
    </div>
  )
}
