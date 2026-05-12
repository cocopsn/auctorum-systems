import { headers } from 'next/headers'
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

  // Provisioning status gate. A tenant in 'unverified' or 'pending_plan'
  // (signed up but never paid) can ONLY access the subscription /
  // billing surfaces and the onboarding wizard. Anything else bounces
  // back to /settings/subscription so they convert.
  //
  // Pre-2026-05-12 this gate didn't exist — anyone who signed up
  // accessed the full dashboard for free.
  const status = tenant.provisioningStatus ?? 'draft'
  if (status === 'unverified' || status === 'pending_plan' || status === 'draft') {
    const path = headers().get('x-pathname') ?? ''
    // Allowlist of paths a non-paying tenant CAN reach.
    const allowed =
      path === '/settings/subscription' ||
      path.startsWith('/settings/billing') ||
      path.startsWith('/onboarding') ||
      // The user might land on /citas right after magic-link — let
      // that one slot through so they don't see a redirect loop while
      // we wait for them to click "Pagar".
      false
    if (!allowed) {
      redirect('/settings/subscription?reason=pending_plan')
    }
  }
  if (status === 'suspended' || status === 'cancelled') {
    redirect('/settings/subscription?reason=' + status)
  }

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
