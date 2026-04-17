'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarDays,
  CalendarCheck,
  Users,
  FileText,
  Clock,
  Settings,
  Menu,
  X,
  LogOut,
} from 'lucide-react'

const navItems = [
  { href: '/agenda', label: 'Agenda', icon: CalendarDays },
  { href: '/citas', label: 'Citas', icon: CalendarCheck },
  { href: '/pacientes', label: 'Pacientes', icon: Users },
  { href: '/notas', label: 'Notas Clínicas', icon: FileText },
  { href: '/horarios', label: 'Horarios', icon: Clock },
  { href: '/settings', label: 'Configuración', icon: Settings },
]

export function Sidebar({ doctorName }: { doctorName: string }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-secondary)]"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-gray-900/30 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-full w-56 bg-[var(--bg-primary)] border-r border-[var(--border)] z-40
          flex flex-col transition-transform duration-300 lg:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-5 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-muted)] flex items-center justify-center">
              <svg className="w-4 h-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{doctorName}</p>
              <p className="text-[11px] text-[var(--text-tertiary)]">Dashboard</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                  ${isActive
                    ? 'bg-[var(--accent-muted)] text-[var(--accent)] font-medium'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                  }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-[var(--border)]">
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors w-full"
            >
              <LogOut className="w-3.5 h-3.5" />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>
    </>
  )
}
