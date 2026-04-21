import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { getAuthTenant } from '@/lib/auth'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { db, onboardingProgress } from '@quote-engine/db'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const auth = await getAuthTenant()
  if (!auth) redirect('/login')
  const tenant = auth.tenant
  const config = (tenant.config as Record<string, unknown>) || {}

  // Check if tenant has completed onboarding — redirect if not
  const [progress] = await db
    .select({ completedAt: onboardingProgress.completedAt })
    .from(onboardingProgress)
    .where(eq(onboardingProgress.tenantId, tenant.id))
    .limit(1)

  if (!progress?.completedAt) {
    redirect('/onboarding')
  }

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
