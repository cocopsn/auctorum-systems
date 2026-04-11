import { redirect } from 'next/navigation'
import { AppShell, type DashboardNavItem } from '@quote-engine/ui'
import {
  Bell,
  CalendarCheck,
  CalendarDays,
  Clock,
  Bot,
  FileText,
  GitBranch,
  Heart,
  MessageSquare,
  Receipt,
  Settings,
  Users,
} from 'lucide-react'
import { getAuthTenant } from '@/lib/auth'
import { ToastContainer } from '@/components/ui/Toast'
import { OnboardingGate } from '@/components/onboarding/onboarding-gate'

const navItems: DashboardNavItem[] = [
  { href: '/agenda', label: 'Agenda', icon: CalendarDays },
  { href: '/recordatorios', label: 'Recordatorios', icon: Bell },
  { href: '/conversaciones', label: 'Conversaciones', icon: MessageSquare },
  { href: '/citas', label: 'Citas', icon: CalendarCheck },
  { href: '/pacientes', label: 'Pacientes', icon: Users },
  { href: '/notas', label: 'Notas Clinicas', icon: FileText },
  { href: '/horarios', label: 'Horarios', icon: Clock },
  { href: '/funnel', label: 'Embudo', icon: GitBranch },
  { href: '/reports', label: 'Reportes', icon: FileText },
  { href: '/follow-ups', label: 'Seguimientos', icon: Heart },
  { href: '/budgets', label: 'Presupuestos', icon: Receipt },
  { href: '/ai-settings', label: 'AI Concierge', icon: Bot },
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
