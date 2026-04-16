'use client'

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
import { AppShell, type DashboardNavItem } from '@quote-engine/ui'
import { ToastContainer } from '@/components/ui/Toast'
import { OnboardingGate } from '@/components/onboarding/onboarding-gate'
import { DashboardRealtimeIndicator } from '@/components/DashboardRealtimeIndicator'

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

export function DashboardShell({
  brand,
  userName,
  tenantId,
  children,
}: {
  brand: string
  userName: string
  tenantId: string
  children: React.ReactNode
}) {
  return (
    <>
      <DashboardRealtimeIndicator tenantId={tenantId} />
      <AppShell
        navItems={navItems}
        brand={brand}
        logoUrl="/logo-transparent.png"
        appName="MedConcierge"
        userName={userName}
        greeting={`Welcome back, ${userName}!`}
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
