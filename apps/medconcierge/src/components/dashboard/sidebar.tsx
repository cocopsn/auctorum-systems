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
  Stethoscope,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard/agenda', label: 'Agenda', icon: CalendarDays },
  { href: '/dashboard/citas', label: 'Citas', icon: CalendarCheck },
  { href: '/dashboard/pacientes', label: 'Pacientes', icon: Users },
  { href: '/dashboard/notas', label: 'Notas Clínicas', icon: FileText },
  { href: '/dashboard/horarios', label: 'Horarios', icon: Clock },
  { href: '/dashboard/settings', label: 'Configuración', icon: Settings },
]

export function Sidebar({ doctorName }: { doctorName: string }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border border-gray-200"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-40
          flex flex-col transition-transform lg:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-tenant-primary flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{doctorName}</p>
              <p className="text-xs text-gray-500">Dashboard</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${isActive
                    ? 'bg-tenant-primary/10 text-tenant-primary'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100">
          <p className="text-[10px] text-gray-300 text-center">Auctorum Systems</p>
        </div>
      </aside>
    </>
  )
}
