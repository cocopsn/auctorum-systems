'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings, MessageSquare, Bot, Users, CreditCard, FileText, Radio, Shield, Sparkles, Palette, KeyRound, Megaphone, Instagram } from 'lucide-react'

const settingsNav = [
  { href: '/settings', label: 'General', icon: Settings, exact: true },
  { href: '/settings/messages', label: 'Mensajes del Bot', icon: MessageSquare },
  { href: '/settings/bot', label: 'Bot IA', icon: Bot },
  { href: '/settings/team', label: 'Equipo', icon: Users },
  { href: '/settings/payments', label: 'Pagos', icon: CreditCard },
  { href: '/settings/billing', label: 'Facturacion', icon: FileText },
  { href: '/settings/channels', label: 'Canales', icon: Radio },
  { href: '/settings/instagram', label: 'Instagram', icon: Instagram },
  { href: '/settings/ads', label: 'Publicidad', icon: Megaphone },
  { href: '/settings/security', label: 'Seguridad', icon: Shield },
  { href: '/settings/subscription', label: 'Suscripcion', icon: Sparkles },
  { href: '/settings/appearance', label: 'Apariencia', icon: Palette },
  { href: '/settings/api', label: 'API', icon: KeyRound },
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
