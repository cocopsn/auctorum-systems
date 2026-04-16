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

  return (
    <DashboardShell
      brand={tenant.name}
      userName={tenant.name}
      tenantId={tenant.id}
    >
      {children}
    </DashboardShell>
  )
}
