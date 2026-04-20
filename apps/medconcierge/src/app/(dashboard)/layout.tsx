import { redirect } from 'next/navigation'
import { getAuthTenant } from '@/lib/auth'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const auth = await getAuthTenant()
  if (!auth) redirect('/login')
  const tenant = auth.tenant
  const config = (tenant.config as Record<string, unknown>) || {}

  return (
    <DashboardShell
      brand={tenant.name}
      userName={tenant.name}
      tenantId={tenant.id}
      themeKey={(config.dashboardTheme as string) || 'teal-default'}
      sidebarItemIds={config.sidebarItems as string[] | undefined}
    >
      {children}
    </DashboardShell>
  )
}
