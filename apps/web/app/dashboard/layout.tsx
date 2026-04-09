'use client';

import {
  BarChart3,
  Bot,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Package,
  Settings,
  Users,
} from 'lucide-react';
import { AppShell, type DashboardNavItem } from '@quote-engine/ui';
import { ToastContainer } from '../../components/ui/Toast';

const navItems: DashboardNavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/quotes', label: 'Cotizaciones', icon: FileText },
  { href: '/dashboard/conversations', label: 'Conversaciones', icon: MessageSquare },
  { href: '/dashboard/products', label: 'Productos', icon: Package },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/clients', label: 'Clientes', icon: Users },
  { href: '/dashboard/ai-settings', label: 'AI Concierge', icon: Bot },
  { href: '/dashboard/settings', label: 'Configuracion', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppShell
        navItems={navItems}
        brand="Auctorum Systems"
        appName="Quote Engine"
        userName="Admin"
        greeting="Welcome back, Admin!"
        subtitle="Gestion de cotizaciones, clientes y concierge AI."
        ctaHref="/dashboard/ai-settings"
      >
        {children}
      </AppShell>
      <ToastContainer />
    </>
  );
}
