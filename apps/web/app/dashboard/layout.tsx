'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Bot,
  CreditCard,
  FileText,
  GitBranch,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Package,
  Plug,
  Receipt,
  Settings,
  Users,
  PanelsTopLeft,
  Check,
} from 'lucide-react'
import { usePathname } from 'next/navigation'
import { AppShell, type DashboardNavItem } from '@quote-engine/ui'
import { ToastContainer } from '../../components/ui/Toast'
import { OnboardingGate } from '../../components/onboarding/onboarding-gate'

type ModuleKey =
  | 'dashboard'
  | 'onboarding'
  | 'quotes'
  | 'clients'
  | 'funnel'
  | 'products'
  | 'budgets'
  | 'payments'
  | 'invoices'
  | 'campaigns'
  | 'conversations'
  | 'integrations'
  | 'reports'
  | 'ai-settings'
  | 'settings'

type ShellResponse = {
  tenant: { name: string; type: 'medical' | 'industrial'; plan: string }
  user: { name: string }
  preferences: { hiddenWidgets: ModuleKey[]; widgetOrder: ModuleKey[]; defaultLandingModule?: string | null }
}

const PLAN_LABELS: Record<string, string> = {
  basico: 'Plan Básico',
  auctorum: 'Plan Auctorum',
  enterprise: 'Plan Enterprise',
}

const MODULE_REGISTRY: Record<ModuleKey, DashboardNavItem & { tenantTypes: Array<'medical' | 'industrial'> }> = {
  dashboard: { key: 'dashboard', href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, tenantTypes: ['medical', 'industrial'] },
  onboarding: { key: 'onboarding', href: '/dashboard/onboarding', label: 'Onboarding', icon: PanelsTopLeft, tenantTypes: ['medical', 'industrial'] },
  quotes: { key: 'quotes', href: '/dashboard/quotes', label: 'Cotizaciones', icon: FileText, tenantTypes: ['industrial'] },
  clients: { key: 'clients', href: '/dashboard/clients', label: 'Pacientes / Clientes', icon: Users, tenantTypes: ['medical', 'industrial'] },
  funnel: { key: 'funnel', href: '/dashboard/funnel', label: 'Embudo', icon: GitBranch, tenantTypes: ['medical', 'industrial'] },
  products: { key: 'products', href: '/dashboard/products', label: 'Productos / Servicios', icon: Package, tenantTypes: ['industrial'] },
  budgets: { key: 'budgets', href: '/dashboard/budgets', label: 'Presupuestos', icon: Receipt, tenantTypes: ['medical', 'industrial'] },
  payments: { key: 'payments', href: '/dashboard/payments', label: 'Pagos', icon: CreditCard, tenantTypes: ['medical', 'industrial'] },
  invoices: { key: 'invoices', href: '/dashboard/invoices', label: 'Facturas', icon: FileText, tenantTypes: ['medical', 'industrial'] },
  campaigns: { key: 'campaigns', href: '/dashboard/campaigns', label: 'Campanas', icon: Megaphone, tenantTypes: ['industrial'] },
  conversations: { key: 'conversations', href: '/dashboard/conversations', label: 'Conversaciones', icon: MessageSquare, tenantTypes: ['medical', 'industrial'] },
  integrations: { key: 'integrations', href: '/dashboard/integrations', label: 'Integraciones', icon: Plug, tenantTypes: ['medical', 'industrial'] },
  reports: { key: 'reports', href: '/dashboard/reports', label: 'Reportes', icon: FileText, tenantTypes: ['medical', 'industrial'] },
  'ai-settings': { key: 'ai-settings', href: '/dashboard/ai-settings', label: 'AI Concierge', icon: Bot, tenantTypes: ['medical', 'industrial'] },
  settings: { key: 'settings', href: '/dashboard/settings', label: 'Configuracion', icon: Settings, tenantTypes: ['medical', 'industrial'] },
}

const DEFAULT_ORDER: ModuleKey[] = [
  'dashboard',
  'onboarding',
  'conversations',
  'clients',
  'funnel',
  'quotes',
  'products',
  'budgets',
  'payments',
  'invoices',
  'campaigns',
  'integrations',
  'reports',
  'ai-settings',
  'settings',
]

function Customizer({
  visibleKeys,
  hiddenKeys,
  onSave,
}: {
  visibleKeys: ModuleKey[]
  hiddenKeys: ModuleKey[]
  onSave: (nextHidden: ModuleKey[]) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [draftHidden, setDraftHidden] = useState<ModuleKey[]>(hiddenKeys)

  useEffect(() => {
    setDraftHidden(hiddenKeys)
  }, [hiddenKeys])

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
      >
        Personalizar panel
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
          <p className="text-sm font-semibold text-slate-900">Modulos visibles</p>
          <div className="mt-4 space-y-2">
            {visibleKeys.map((key) => {
              const item = MODULE_REGISTRY[key]
              const checked = !draftHidden.includes(key)
              return (
                <label key={key} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm text-slate-700">
                  <span>{item.label}</span>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      setDraftHidden((current) => event.target.checked ? current.filter((value) => value !== key) : [...current, key])
                    }}
                  />
                </label>
              )
            })}
          </div>
          <button
            type="button"
            onClick={async () => {
              await onSave(draftHidden)
              setOpen(false)
            }}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Check className="h-4 w-4" />
            Guardar preferencias
          </button>
        </div>
      )}
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [shell, setShell] = useState<ShellResponse | null>(null)
  const [hiddenWidgets, setHiddenWidgets] = useState<ModuleKey[]>([])

  useEffect(() => {
    fetch('/api/dashboard/shell')
      .then((r) => r.json())
      .then((data) => {
        setShell(data)
        setHiddenWidgets((data.preferences?.hiddenWidgets || []) as ModuleKey[])
      })
      .catch(() => {
        setShell({
          tenant: { name: 'Auctorum Systems', type: 'industrial', plan: 'basico' },
          user: { name: 'Admin' },
          preferences: { hiddenWidgets: [], widgetOrder: [] },
        })
      })
  }, [])

  const navItems = useMemo(() => {
    const tenantType = shell?.tenant.type || 'industrial'
    const allowed = DEFAULT_ORDER.filter((key) => MODULE_REGISTRY[key].tenantTypes.includes(tenantType))
    const visible = allowed.filter((key) => !hiddenWidgets.includes(key))
    return visible.map((key) => MODULE_REGISTRY[key])
  }, [hiddenWidgets, shell?.tenant.type])

  const customizableKeys = useMemo(() => {
    const tenantType = shell?.tenant.type || 'industrial'
    return DEFAULT_ORDER.filter((key) => MODULE_REGISTRY[key].tenantTypes.includes(tenantType))
  }, [shell?.tenant.type])

  async function savePreferences(nextHidden: ModuleKey[]) {
    setHiddenWidgets(nextHidden)
    await fetch('/api/dashboard/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hiddenWidgets: nextHidden,
        widgetOrder: customizableKeys,
        defaultLandingModule: 'dashboard',
      }),
    })
  }

  return (
    <>
      <AppShell
        navItems={navItems}
        brand={shell?.tenant.name || 'Auctorum Systems'}
        logoUrl="/logo.png"
        appName={shell?.tenant.type === 'medical' ? 'Portal Medico' : 'Portal Unificado'}
        userName={shell?.user.name || 'Admin'}
        planLabel={PLAN_LABELS[shell?.tenant.plan || 'basico'] || 'Plan Básico'}
        greeting="Bienvenido de vuelta"
        subtitle={shell?.tenant.type === 'medical' ? 'Gestion, onboarding e integraciones del consultorio.' : 'Gestion comercial, integraciones y operacion.'}
        ctaHref="/dashboard/ai-settings"
        headerActions={
          <Customizer
            visibleKeys={customizableKeys}
            hiddenKeys={hiddenWidgets}
            onSave={savePreferences}
          />
        }
      >
        <OnboardingGate>
          <div key={pathname}>{children}</div>
        </OnboardingGate>
      </AppShell>
      <ToastContainer />
    </>
  )
}
