import {
  CalendarDays,
  CalendarCheck,
  Users,
  MessageSquare,
  GitBranch,
  Megaphone,
  CreditCard,
  FileText,
  Receipt,
  BarChart3,
  Bell,
  Bot,
  Globe,
  Plug,
  Settings,
  LayoutDashboard,
} from 'lucide-react'
import type { ComponentType } from 'react'

export type SidebarItemDef = {
  id: string
  label: string
  href: string
  icon: ComponentType<{ className?: string }>
  required: boolean
  group: string
}

export const ALL_SIDEBAR_ITEMS: SidebarItemDef[] = [
  // PRINCIPAL
  { id: 'dashboard', label: 'Dashboard', href: '/agenda', icon: LayoutDashboard, required: true, group: 'PRINCIPAL' },
  { id: 'funnel', label: 'Embudo', href: '/funnel', icon: GitBranch, required: false, group: 'PRINCIPAL' },
  { id: 'citas', label: 'Citas', href: '/citas', icon: CalendarCheck, required: false, group: 'PRINCIPAL' },
  { id: 'conversaciones', label: 'Conversaciones', href: '/conversaciones', icon: MessageSquare, required: false, group: 'PRINCIPAL' },
  { id: 'pacientes', label: 'Pacientes', href: '/pacientes', icon: Users, required: false, group: 'PRINCIPAL' },
  // GESTIÓN
  { id: 'agenda', label: 'Agenda', href: '/agenda', icon: CalendarDays, required: true, group: 'GESTIÓN' },
  { id: 'reports', label: 'Reportes', href: '/reports', icon: BarChart3, required: false, group: 'GESTIÓN' },
  { id: 'budgets', label: 'Presupuestos', href: '/budgets', icon: Receipt, required: false, group: 'GESTIÓN' },
  { id: 'payments', label: 'Pagos', href: '/payments', icon: CreditCard, required: false, group: 'GESTIÓN' },
  { id: 'invoices', label: 'Facturas', href: '/invoices', icon: FileText, required: false, group: 'GESTIÓN' },
  // MARKETING
  { id: 'campaigns', label: 'Campañas', href: '/campaigns', icon: Megaphone, required: false, group: 'MARKETING' },
  { id: 'integrations', label: 'Integraciones', href: '/integrations', icon: Plug, required: false, group: 'MARKETING' },
  // MÉDICO
  { id: 'ai-settings', label: 'AI Concierge', href: '/ai-settings', icon: Bot, required: false, group: 'MÉDICO' },
  { id: 'portal', label: 'Portal del Doctor', href: '/portal', icon: Globe, required: false, group: 'MÉDICO' },
  // CONFIGURACIÓN
  { id: 'settings', label: 'Configuración', href: '/settings', icon: Settings, required: true, group: 'CONFIGURACIÓN' },
]

export const DEFAULT_VISIBLE_IDS = ALL_SIDEBAR_ITEMS.map(i => i.id)

export function getVisibleItems(enabledIds: string[]): SidebarItemDef[] {
  return ALL_SIDEBAR_ITEMS.filter(
    item => item.required || enabledIds.includes(item.id)
  )
}
