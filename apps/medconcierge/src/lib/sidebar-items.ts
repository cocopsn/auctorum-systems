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
  Sparkles,
  FolderOpen,
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
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, required: true, group: 'PRINCIPAL' },
  { id: 'funnel', label: 'Embudo', href: '/funnel', icon: GitBranch, required: false, group: 'PRINCIPAL' },
  { id: 'citas', label: 'Citas', href: '/citas', icon: CalendarCheck, required: false, group: 'PRINCIPAL' },
  { id: 'conversaciones', label: 'Conversaciones', href: '/conversaciones', icon: MessageSquare, required: false, group: 'PRINCIPAL' },
  { id: 'pacientes', label: 'Pacientes', href: '/pacientes', icon: Users, required: false, group: 'PRINCIPAL' },
  { id: 'documentos', label: 'Documentos', href: '/documentos', icon: FolderOpen, required: false, group: 'PRINCIPAL' },
  // GESTIÓN
  { id: 'agenda', label: 'Agenda', href: '/agenda', icon: CalendarDays, required: true, group: 'GESTIÓN' },
  // /reports was the legacy B2B clone that returned undefined / $NaN. The
  // canonical page is /reportes (medical KPIs + revenue chart + status
  // bars + weekday heatmap + CSV/PDF exports). Sidebar now points there.
  { id: 'reportes', label: 'Reportes', href: '/reportes', icon: BarChart3, required: false, group: 'GESTIÓN' },
  { id: 'budgets', label: 'Presupuestos', href: '/budgets', icon: Receipt, required: false, group: 'GESTIÓN' },
  // Two payments pages used to coexist: /payments (legacy with broken
  // refund button + Stripe-secret form) and /pagos (Stripe Connect). We
  // keep the canonical /pagos in the sidebar; /payments still resolves
  // for users with bookmarks but its sidebar entry is gone.
  { id: 'pagos', label: 'Pagos', href: '/pagos', icon: CreditCard, required: false, group: 'GESTIÓN' },
  { id: 'invoices', label: 'Facturas', href: '/invoices', icon: FileText, required: false, group: 'GESTIÓN' },
  // MARKETING
  { id: 'leads', label: 'Leads', href: '/leads', icon: Sparkles, required: false, group: 'MARKETING' },
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
