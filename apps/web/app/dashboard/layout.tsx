'use client';

import {
  BarChart3,
  Bot,
  FileText,
  GitBranch,
  Heart,
  LayoutDashboard,
  MessageSquare,
  Package,
  Receipt,
  Settings,
  Users,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { AppShell, type DashboardNavItem } from '@quote-engine/ui';
import { ToastContainer } from '../../components/ui/Toast';
import { OnboardingGate } from '../../components/onboarding/onboarding-gate';

const navItems: DashboardNavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/quotes', label: 'Cotizaciones', icon: FileText },
  { href: '/dashboard/conversations', label: 'Conversaciones', icon: MessageSquare },
  { href: '/dashboard/products', label: 'Productos', icon: Package },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/clients', label: 'Clientes', icon: Users },
  { href: '/dashboard/funnel', label: 'Embudo', icon: GitBranch },
  { href: '/dashboard/reports', label: 'Reportes', icon: FileText },
  { href: '/dashboard/follow-ups', label: 'Seguimientos', icon: Heart },
  { href: '/dashboard/budgets', label: 'Presupuestos', icon: Receipt },
  { href: '/dashboard/ai-settings', label: 'AI Concierge', icon: Bot },
  { href: '/dashboard/settings', label: 'Configuración', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <>
      <AppShell
        navItems={navItems}
        brand="Auctorum Systems"
        logoUrl="/logo-transparent.png"
        appName="Quote Engine"
        userName="Admin"
        greeting="Welcome back, Admin!"
        subtitle="Gestión de cotizaciones, clientes y concierge AI."
        ctaHref="/dashboard/ai-settings"
      >
        <OnboardingGate><div key={pathname}>{children}</div></OnboardingGate>
      </AppShell>
      <ToastContainer />
    </>
  );
}
