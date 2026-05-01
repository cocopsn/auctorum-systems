'use client'

import {
  Bot,
  CalendarCheck,
  CalendarDays,
  CreditCard,
  FileText,
  GitBranch,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Plug,
  Receipt,
  Globe,
  Settings,
  Users,
  BarChart3,
  Bell,
} from 'lucide-react'
import { AppShell, type DashboardNavItem } from '@quote-engine/ui'
import { ToastContainer } from '@/components/ui/Toast'
import { OnboardingGate } from '@/components/onboarding/onboarding-gate'
import { DashboardRealtimeIndicator } from '@/components/DashboardRealtimeIndicator'
import { DASHBOARD_THEMES, DEFAULT_THEME, type ThemeKey } from '@/lib/dashboard-themes'
import { ALL_SIDEBAR_ITEMS, getVisibleItems } from '@/lib/sidebar-items'

const ICON_MAP: Record<string, typeof LayoutDashboard> = {
  LayoutDashboard, GitBranch, CalendarCheck, MessageSquare, Users,
  CalendarDays, BarChart3, Receipt, CreditCard, FileText,
  Megaphone, Plug, Bot, Globe, Settings, Bell,
}

function buildNavItems(enabledIds: string[]): DashboardNavItem[] {
  const visible = getVisibleItems(enabledIds)
  return visible.map(item => ({
    href: item.href,
    label: item.label,
    icon: item.icon,
  }))
}

export function DashboardShell({
  brand,
  userName,
  tenantId,
  themeKey,
  sidebarItemIds,
  children,
}: {
  brand: string
  userName: string
  tenantId: string
  themeKey?: string
  sidebarItemIds?: string[]
  children: React.ReactNode
}) {
  const theme = DASHBOARD_THEMES[(themeKey as ThemeKey) || DEFAULT_THEME] || DASHBOARD_THEMES[DEFAULT_THEME]
  const navItems = buildNavItems(sidebarItemIds || ALL_SIDEBAR_ITEMS.map(i => i.id))

  const themeStyles = {
    '--theme-primary': theme.primary,
    '--theme-primary-hover': theme.primaryHover,
    '--theme-primary-light': theme.primaryLight,
    '--theme-sidebar': theme.sidebar,
    '--theme-sidebar-hover': theme.sidebarHover,
    '--theme-sidebar-border': theme.sidebarBorder,
    '--theme-sidebar-text': theme.sidebarText,
    '--theme-sidebar-foreground': theme.sidebarForeground,
    '--theme-sidebar-active': theme.sidebarActive,
    '--theme-sidebar-active-bg': theme.sidebarActiveBg,
    '--theme-sidebar-active-fg': theme.sidebarActiveFg,
    '--theme-user-card-bg': theme.userCardBg,
    '--theme-accent': theme.accent,
  } as React.CSSProperties

  return (
    <div style={themeStyles}>
      <DashboardRealtimeIndicator tenantId={tenantId} />
      <AppShell
        navItems={navItems}
        brand={brand}
        logoUrl="/logo-transparent.png"
        appName="MedConcierge"
        userName={userName}
        greeting={`Bienvenido, ${userName}`}
        subtitle="Agenda, pacientes y concierge médico en un solo panel."
        ctaHref="/ai-settings"
        logoutAction="/api/auth/logout"
      >
        <OnboardingGate>{children}</OnboardingGate>
      </AppShell>
      <ToastContainer />
    </div>
  )
}
