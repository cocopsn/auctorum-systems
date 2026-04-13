import { redirect } from 'next/navigation'
import { AppShell, type DashboardNavItem } from '@quote-engine/ui'
import {
  Bot,
  CalendarCheck,
  CalendarDays,
  CreditCard,
  FileText,
  GitBranch,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Plug,
  Receipt,
  Globe,
  Settings,
  Users,
} from 'lucide-react'
import { getAuthTenant } from '@/lib/auth'
import { ToastContainer } from '@/components/ui/Toast'
import { OnboardingGate } from '@/components/onboarding/onboarding-gate'

const navItems: DashboardNavItem[] = [
  // PRINCIPAL
  { href: '/agenda', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/funnel', label: 'Embudo', icon: GitBranch },
  { href: '/citas', label: 'Citas', icon: CalendarCheck },
  { href: '/conversaciones', label: 'Conversaciones', icon: MessageSquare },
  { href: '/pacientes', label: 'Pacientes', icon: Users },
  // GESTION
  { href: '/agenda', label: 'Agenda', icon: CalendarDays },
  { href: '/reports', label: 'Reportes', icon: FileText },
  { href: '/budgets', label: 'Presupuestos', icon: Receipt },
  { href: '/payments', label: 'Pagos', icon: CreditCard },
  { href: '/invoices', label: 'Facturas', icon: FileText },
  // MARKETING
  { href: '/campaigns', label: 'Campanas', icon: Megaphone },
  { href: '/integrations', label: 'Integraciones', icon: Plug },
  // MEDICO
  { href: '/ai-settings', label: 'AI Concierge', icon: Bot },
  { href: '/portal', label: 'Portal del Doctor', icon: Globe },
  // CONFIGURACION
  { href: '/settings', label: 'Configuracion', icon: Settings },
]

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const auth = await getAuthTenant()
  if (!auth) redirect('/login')
  const tenant = auth.tenant

  return (
    <>
      <AppShell
        navItems={navItems}
        brand={tenant.name}
        logoUrl="/logo-transparent.png"
        appName="MedConcierge"
        userName={tenant.name}
        greeting={`Welcome back, ${tenant.name}!`}
        subtitle="Agenda, pacientes y concierge medico en un solo panel."
        ctaHref="/ai-settings"
        logoutAction="/api/auth/logout"
      >
        <OnboardingGate>{children}</OnboardingGate>
      </AppShell>
      <ToastContainer />
    </>
  )
}
