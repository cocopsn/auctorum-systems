'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings, MessageSquare, Bot } from 'lucide-react'

const settingsNav = [
  { href: '/dashboard/settings', label: 'General', icon: Settings, exact: true },
  { href: '/dashboard/settings/messages', label: 'Mensajes del Bot', icon: MessageSquare },
  { href: '/dashboard/settings/bot', label: 'Bot IA', icon: Bot },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div>
      <div className="border-b border-gray-200 bg-white px-6 pt-4">
        <div className="flex gap-1 overflow-x-auto">
          {settingsNav.map(item => {
            const Icon = item.icon
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  active
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            )
          })}
        </div>
      </div>
      {children}
    </div>
  )
}
