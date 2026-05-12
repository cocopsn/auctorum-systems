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
  /**
   * Plan tier required to unlock this item. Mirror of the server-side
   * gates in apps/medconcierge/src/lib/plan-gating.ts. If set, AppShell
   * renders a "PRO" badge (gradient if locked, subtle if unlocked).
   */
  requiredPlan?: 'auctorum' | 'enterprise'
}

export const ALL_SIDEBAR_ITEMS: SidebarItemDef[] = [
  // PRINCIPAL
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, required: true, group: 'PRINCIPAL' },
  { id: 'funnel', label: 'Embudo', href: '/funnel', icon: GitBranch, required: false, group: 'PRINCIPAL' },
  { id: 'citas', label: 'Citas', href: '/citas', icon: CalendarCheck, required: false, group: 'PRINCIPAL' },
  { id: 'conversaciones', label: 'Conversaciones', href: '/conversaciones', icon: MessageSquare, required: false, group: 'PRINCIPAL' },
  { id: 'pacientes', label: 'Pacientes', href: '/pacientes', icon: Users, required: false, group: 'PRINCIPAL' },
  // Smart Documents (AI classifier + storage) is gated server-side via
  // `requireFeature(plan, 'smart_documents')` in /api/dashboard/documents.
  // Match it in the sidebar so basico tenants see the PRO badge.
  { id: 'documentos', label: 'Documentos', href: '/documentos', icon: FolderOpen, required: false, group: 'PRINCIPAL', requiredPlan: 'auctorum' },
  // GESTIÓN
  { id: 'agenda', label: 'Agenda', href: '/agenda', icon: CalendarDays, required: true, group: 'GESTIÓN' },
  { id: 'reportes', label: 'Reportes', href: '/reportes', icon: BarChart3, required: false, group: 'GESTIÓN' },
  { id: 'budgets', label: 'Presupuestos', href: '/budgets', icon: Receipt, required: false, group: 'GESTIÓN' },
  // Stripe Connect is Auctorum+ (server-gated via hasFeature stripe_connect).
  { id: 'pagos', label: 'Pagos', href: '/pagos', icon: CreditCard, required: false, group: 'GESTIÓN', requiredPlan: 'auctorum' },
  // CFDI invoicing is Auctorum+ (server-gated via hasFeature cfdi_invoicing).
  { id: 'invoices', label: 'Facturas', href: '/invoices', icon: FileText, required: false, group: 'GESTIÓN', requiredPlan: 'auctorum' },
  // MARKETING
  { id: 'leads', label: 'Leads', href: '/leads', icon: Sparkles, required: false, group: 'MARKETING' },
  // Campaign send is server-gated via hasFeature campaigns.
  { id: 'campaigns', label: 'Campañas', href: '/campaigns', icon: Megaphone, required: false, group: 'MARKETING', requiredPlan: 'auctorum' },
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
