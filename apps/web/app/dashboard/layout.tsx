'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ToastContainer } from '../../components/ui/Toast';
import {
  LayoutDashboard,
  FileText,
  Package,
  BarChart3,
  Users,
  Settings,
  X,
  Menu,
  LogOut,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/quotes', label: 'Cotizaciones', icon: FileText },
  { href: '/dashboard/products', label: 'Productos', icon: Package },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/clients', label: 'Clientes', icon: Users },
  { href: '/dashboard/settings', label: 'Configuración', icon: Settings },
];

function SidebarContent({ pathname, onClose }: { pathname: string; onClose?: () => void }) {
  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)] border-r border-[var(--border)]">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[var(--border)]">
        <div className="w-8 h-8 rounded-lg bg-[var(--accent-muted)] flex items-center justify-center">
          <span className="text-[var(--accent)] text-xs font-bold">AS</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">Auctorum Systems</p>
          <p className="text-[11px] text-[var(--text-tertiary)] truncate">Motor de Cotizaciones</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto" role="navigation" aria-label="Menu principal">
        {navItems.map(item => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              {...(isActive ? { 'aria-current': 'page' as const } : {})}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-[var(--accent-muted)] text-[var(--accent)] font-medium'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-[var(--border)]">
        <p className="text-[11px] text-[var(--text-tertiary)] text-center">Auctorum Systems</p>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 fixed inset-y-0 z-30">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-56 z-50">
            <div className="absolute top-3 right-3 z-10">
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                aria-label="Cerrar menú"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <SidebarContent pathname={pathname} onClose={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-56 flex flex-col min-h-screen">
        <header className="bg-[var(--bg-primary)]/80 backdrop-blur-xl border-b border-[var(--border)] sticky top-0 z-20">
          <div className="flex items-center justify-between px-6 h-12">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-colors"
              aria-label="Abrir menú"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium text-[var(--text-primary)] lg:hidden">Auctorum Systems</span>
            <div className="hidden lg:block" />
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                Cerrar sesión
              </button>
            </form>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}
