import { AppShell, type DashboardNavItem } from '@quote-engine/ui'
import {
  Bot,
  CalendarCheck,
  CalendarDays,
  Clock,
  FileText,
  Settings,
  Users,
} from 'lucide-react'
import { eq } from 'drizzle-orm'
import { db, tenants } from '@quote-engine/db'
import { ToastContainer } from '@/components/ui/Toast'

const navItems: DashboardNavItem[] = [
  { href: '/agenda', label: 'Agenda', icon: CalendarDays },
  { href: '/citas', label: 'Citas', icon: CalendarCheck },
  { href: '/pacientes', label: 'Pacientes', icon: Users },
  { href: '/notas', label: 'Notas Clinicas', icon: FileText },
  { href: '/horarios', label: 'Horarios', icon: Clock },
  { href: '/ai-settings', label: 'AI Concierge', icon: Bot },
  { href: '/settings', label: 'Configuracion', icon: Settings },
]

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
    return <div className="min-h-screen bg-gray-50 p-8 text-rose-600">Tenant not found. Run seed first.</div>
  }

  return (
    <>
      <AppShell
        navItems={navItems}
        brand={tenant.name}
        appName="MedConcierge"
        userName={tenant.name}
        greeting={`Welcome back, ${tenant.name}!`}
        subtitle="Agenda, pacientes y concierge medico en un solo panel."
        ctaHref="/ai-settings"
        logoutAction="/api/auth/logout"
      >
        {children}
      </AppShell>
      <ToastContainer />
    </>
  )
}
