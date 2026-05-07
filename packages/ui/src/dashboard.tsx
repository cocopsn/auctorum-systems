'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType, ReactNode } from 'react';
import {
  Bell,
  ChevronDown,
  Menu,
  Search,
  Sparkles,
  UploadCloud,
  X,
  Calendar,
  MessageSquare,
  UserPlus,
  AlertCircle,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

export type DashboardNavItem = {
  key?: string;
  href: string;
  label: string;
  // `any` because lucide-react ForwardRefExoticComponent doesn't
  // structurally match React's ComponentType across @types/react minor
  // versions. Both apps (web/medconcierge) consume this and we don't want
  // to force `as any` at every callsite.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
};

const NAV_GROUP_LABELS: Record<number, string> = {
  0: 'PRINCIPAL',
  5: 'GESTIÓN',
  10: 'MARKETING',
  12: 'MÉDICO',
  14: 'CONFIGURACIÓN',
};

// ---- Notification Bell Component ----

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  metadata: string | null;
  createdAt: string | null;
};

// `any` icon type — see DashboardNavItem.icon comment above.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const NOTIFICATION_ICONS: Record<string, any> = {
  appointment: Calendar,
  message: MessageSquare,
  patient: UserPlus,
  alert: AlertCircle,
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/notifications');
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function markAsRead(id: string) {
    await fetch(`/api/dashboard/notifications/${id}/read`, { method: 'PUT' }).catch(() => {});
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }

  async function markAllRead() {
    await fetch('/api/dashboard/notifications/read-all', { method: 'PUT' }).catch(() => {});
    setNotifications([]);
    setUnreadCount(0);
  }

  function getNotificationHref(n: NotificationItem): string | null {
    try {
      const meta = n.metadata ? JSON.parse(n.metadata) : null;
      if (meta?.href) return meta.href;
    } catch {}
    if (n.type === 'appointment') return '/dashboard/appointments';
    if (n.type === 'message') return '/dashboard/conversations';
    if (n.type === 'patient') return '/dashboard/patients';
    return null;
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-gray-200 transition"
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl border border-slate-200 bg-white shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Notificaciones</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                Marcar todas como leidas
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[var(--theme-sidebar-text,#94a3b8)]">
                No hay notificaciones nuevas
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = NOTIFICATION_ICONS[n.type] || AlertCircle;
                const href = getNotificationHref(n);
                return (
                  <button
                    key={n.id}
                    type="button"
                    className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition border-b border-slate-50 last:border-0"
                    onClick={() => {
                      markAsRead(n.id);
                      if (href) window.location.href = href;
                      setOpen(false);
                    }}
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{n.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-[var(--theme-sidebar-text,#64748b)]">{n.message}</p>
                      <p className="mt-1 text-[11px] text-[var(--theme-sidebar-text,#94a3b8)]">{timeAgo(n.createdAt)}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Main AppShell ----

export function AppShell({
  children,
  navItems,
  brand,
  appName,
  userName,
  planLabel = 'Plan Pro',
  greeting = 'Welcome back',
  subtitle = "Here's what's happening today.",
  ctaHref = '/dashboard/ai-settings',
  logoutAction = '/api/auth/logout',
  logoUrl,
  headerActions,
  showSearch = true,
  showBell = true,
}: {
  children: ReactNode;
  navItems: DashboardNavItem[];
  brand: string;
  appName: string;
  userName: string;
  planLabel?: string;
  greeting?: string;
  subtitle?: string;
  ctaHref?: string;
  logoutAction?: string;
  logoUrl?: string;
  headerActions?: ReactNode;
  /** Render the decorative search input in the top header. Default true. */
  showSearch?: boolean;
  /** Render the notification bell in the top header. Default true. */
  showBell?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-50 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-40 bg-[var(--theme-sidebar,#0f172a)]/40 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[var(--theme-sidebar,#0f172a)] transition-transform duration-300 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center gap-3 border-b border-[var(--theme-sidebar-border,#1e293b)] px-5">
          {logoUrl ? (
            <img src={logoUrl} alt={brand} className="h-10 w-10 rounded-xl object-contain" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--theme-sidebar-active,#1e40af)] text-sm font-bold text-white">
              {brand.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--theme-sidebar-foreground,#ffffff)]">{brand}</p>
            <p className="truncate text-xs text-[var(--theme-sidebar-text,#94a3b8)]">{appName}</p>
          </div>
          <button
            type="button"
            className="ml-auto rounded-lg p-1.5 text-[var(--theme-sidebar-text,#94a3b8)] hover:bg-[var(--theme-sidebar-hover,#1e293b)] hover:text-[var(--theme-sidebar-foreground,#ffffff)] lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Menu principal">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`));
            const groupLabel = NAV_GROUP_LABELS[index];
            return (
              <div key={item.key ?? item.href}>
                {groupLabel && (
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-sidebar-text,#64748b)] px-4 pt-4 pb-1">
                    {groupLabel}
                  </p>
                )}
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition ${
                    active
                      ? 'border-l-2 border-[var(--theme-sidebar-active,#60a5fa)] bg-[var(--theme-sidebar-active-bg,rgba(30,64,175,0.5))] font-medium text-[var(--theme-sidebar-active-fg,#ffffff)]'
                      : 'border-l-2 border-transparent text-[var(--theme-sidebar-text,#cbd5e1)] hover:bg-[var(--theme-sidebar-hover,#1e293b)]'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon className={`h-4 w-4 ${active ? 'text-[var(--theme-sidebar-active-fg,#ffffff)]' : 'text-[var(--theme-sidebar-text,#94a3b8)]'}`} />
                  {item.label}
                </Link>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-[var(--theme-sidebar-border,#1e293b)] p-4">
          <div className="flex items-center gap-3 rounded-2xl bg-[var(--theme-user-card-bg,#1e293b)] p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--theme-sidebar-active,#1e40af)] text-sm font-semibold text-white">
              {userName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--theme-sidebar-foreground,#ffffff)]">{userName}</p>
              <p className="truncate text-xs text-[var(--theme-sidebar-text,#64748b)]">{planLabel}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-[var(--theme-sidebar-text,#94a3b8)]" />
          </div>
          <form action={logoutAction} method="POST" className="mt-3">
            <button type="submit" className="w-full rounded-xl px-3 py-2 text-left text-xs text-[var(--theme-sidebar-text,#64748b)] hover:bg-[var(--theme-sidebar-hover,#1e293b)] hover:text-[var(--theme-sidebar-foreground,#ffffff)]">
              Cerrar sesion
            </button>
          </form>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-64">
        <TopHeader greeting={greeting} subtitle={subtitle} ctaHref={ctaHref} headerActions={headerActions} showSearch={showSearch} showBell={showBell} />
        <main className="min-h-screen bg-slate-50 p-6 sm:p-8">{children}</main>
      </div>
    </div>
  );
}

export function TopHeader({
  greeting,
  subtitle,
  ctaHref,
  headerActions,
  showSearch = true,
  showBell = true,
}: {
  greeting: string;
  subtitle: string;
  ctaHref: string;
  headerActions?: ReactNode;
  showSearch?: boolean;
  showBell?: boolean;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="flex min-h-16 flex-col gap-4 px-5 py-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="ml-12 lg:ml-0">
          <p className="text-sm text-[var(--theme-sidebar-text,#64748b)]">Dashboard / <span className="text-slate-700">{greeting}</span></p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {showSearch ? (
            <label className="flex h-11 min-w-[220px] flex-1 items-center gap-2 rounded-full bg-slate-100 px-4 text-sm text-[var(--theme-sidebar-text,#64748b)] lg:flex-none">
              <Search className="h-4 w-4" />
              <input className="w-full bg-transparent outline-none placeholder:text-[var(--theme-sidebar-text,#94a3b8)]" placeholder="Search here..." />
            </label>
          ) : null}
          {showBell ? <NotificationBell /> : null}
          {headerActions}
        </div>
      </div>
    </header>
  );
}

export function DashboardCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}>{children}</section>;
}

export function KpiCard({
  title,
  value,
  icon: Icon,
  trend,
  positive = true,
}: {
  title: string;
  value: string | number;
  icon: ComponentType<{ className?: string }>;
  trend: string;
  positive?: boolean;
}) {
  return (
    <DashboardCard>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Icon className="h-5 w-5" />
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${positive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
          {trend}
        </span>
      </div>
      <p className="text-sm text-[var(--theme-sidebar-text,#64748b)]">{title}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
    </DashboardCard>
  );
}

export function LineChartCard({
  title,
  subtitle,
  seriesA = 'Generadas',
  seriesB = 'Aprobadas',
}: {
  title: string;
  subtitle: string;
  seriesA?: string;
  seriesB?: string;
}) {
  return (
    <DashboardCard className="min-h-[300px]">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-[var(--theme-sidebar-text,#64748b)]">{subtitle}</p>
        </div>
        <div className="flex gap-3 text-xs text-[var(--theme-sidebar-text,#64748b)]">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" />{seriesA}</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-300" />{seriesB}</span>
        </div>
      </div>
      <svg viewBox="0 0 700 260" className="h-64 w-full overflow-visible">
        {[40, 95, 150, 205].map((y) => (
          <line key={y} x1="32" x2="670" y1={y} y2={y} stroke="#e2e8f0" strokeWidth="2" />
        ))}
        <path d="M45 200 C95 70 125 70 165 110 S240 150 275 85 S360 60 405 125 S500 180 545 105 S610 70 660 95" fill="none" stroke="#2563eb" strokeWidth="5" strokeLinecap="round" />
        <path d="M45 210 C120 180 140 120 190 150 S275 225 335 160 S430 80 480 135 S575 210 660 155" fill="none" stroke="#fdba74" strokeWidth="4" strokeLinecap="round" opacity="0.9" />
        {['Mar 1', 'Mar 5', 'Mar 10', 'Mar 15', 'Mar 20', 'Mar 25', 'Mar 31'].map((label, index) => (
          <text key={label} x={52 + index * 100} y="250" fill="#94a3b8" fontSize="14">{label}</text>
        ))}
      </svg>
    </DashboardCard>
  );
}

export function DonutCard({ title, label, value }: { title: string; label: string; value: string }) {
  return (
    <DashboardCard className="min-h-[300px]">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-[var(--theme-sidebar-text,#64748b)]">Distribution</p>
      <div className="mt-8 flex items-center justify-center">
        <div className="relative h-44 w-44 rounded-full bg-[conic-gradient(#2563eb_0_58%,#dbeafe_58%_78%,#f1f5f9_78%_100%)]">
          <div className="absolute inset-8 flex flex-col items-center justify-center rounded-full bg-white shadow-sm">
            <span className="text-sm text-[var(--theme-sidebar-text,#64748b)]">{label}</span>
            <span className="text-2xl font-semibold text-slate-900">{value}</span>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}

export function ProgressList({ title, items }: { title: string; items: Array<{ label: string; value: string; meta: string; progress: number }> }) {
  return (
    <DashboardCard className="min-h-[300px]">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-[var(--theme-sidebar-text,#64748b)]">Best performers</p>
        </div>
        <span className="text-xs font-medium text-blue-600">View All</span>
      </div>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.label} className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-900">{item.label}</p>
                <p className="mt-1 text-xs text-[var(--theme-sidebar-text,#64748b)]">{item.meta}</p>
              </div>
              <p className="text-lg font-semibold text-slate-900">{item.value}</p>
            </div>
            <div className="mt-4 h-2 rounded-full bg-white">
              <div className="h-2 rounded-full bg-blue-600" style={{ width: `${item.progress}%` }} />
            </div>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}

export function StatusBadge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'success' | 'warning' | 'danger' | 'indigo' | 'neutral' }) {
  const colors = {
    success: 'bg-emerald-50 text-emerald-600',
    warning: 'bg-orange-50 text-orange-600',
    danger: 'bg-red-50 text-red-600',
    indigo: 'bg-blue-50 text-blue-600',
    neutral: 'bg-slate-100 text-slate-600',
  }[tone];
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${colors}`}>{children}</span>;
}

export function AiInsightCard({ insights, href = '/dashboard/ai-settings' }: { insights: Array<{ title: string; body: string }>; href?: string }) {
  return (
    <DashboardCard>
      <h2 className="text-base font-semibold text-slate-900">AI Insights</h2>
      <div className="mt-5 space-y-3">
        {insights.map((insight) => (
          <div key={insight.title} className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-900">{insight.title}</p>
            <p className="mt-1 line-clamp-2 text-sm text-[var(--theme-sidebar-text,#64748b)]">{insight.body}</p>
          </div>
        ))}
      </div>
      <Link href={href} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700">
        <Sparkles className="h-4 w-4" />
        Open AI Assistant
      </Link>
    </DashboardCard>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <span className={`flex h-6 w-11 items-center rounded-full p-1 transition ${checked ? 'bg-blue-600' : 'bg-gray-200'}`}>
        <span className={`h-4 w-4 rounded-full bg-white shadow-sm transition ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </span>
    </button>
  );
}

export function Dropzone({ onFiles }: { onFiles: (files: FileList) => void }) {
  return (
    <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center transition hover:border-blue-200 hover:bg-blue-50/40">
      <UploadCloud className="h-8 w-8 text-blue-500" />
      <span className="mt-3 text-sm font-medium text-slate-900">Arrastra archivos o haz clic para subir</span>
      <span className="mt-1 text-xs text-[var(--theme-sidebar-text,#64748b)]">PDF, TXT, Markdown o DOCX. Maximo 20MB.</span>
      <input type="file" className="sr-only" multiple accept=".pdf,.txt,.md,.markdown,.docx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => event.target.files && onFiles(event.target.files)} />
    </label>
  );
}

type KnowledgeFile = {
  id: string;
  fileName: string;
  mimeType: string;
  status: string | null;
  createdAt: string | Date | null;
};

type AiSettingsState = {
  enabled: boolean;
  systemPrompt: string;
  autoSchedule: boolean;
  answerFaq: boolean;
  humanHandoff: boolean;
  model: string;
};

const defaultSettings: AiSettingsState = {
  enabled: true,
  systemPrompt: '',
  autoSchedule: false,
  answerFaq: true,
  humanHandoff: true,
  model: 'gpt-5-mini',
};

export function AiManager({ title = 'AI Concierge', defaultPrompt }: { title?: string; defaultPrompt: string }) {
  const [settings, setSettings] = useState<AiSettingsState>({ ...defaultSettings, systemPrompt: defaultPrompt });
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [status, setStatus] = useState('');
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState<Array<{ role: 'user' | 'bot'; text: string }>>([
    { role: 'bot', text: 'Listo para probar el comportamiento del concierge antes de activarlo al publico.' },
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/ai/settings').then((r) => r.json()),
      fetch('/api/ai/knowledge').then((r) => r.json()),
    ])
      .then(([settingsResponse, filesResponse]) => {
        if (settingsResponse.success) setSettings({ ...defaultSettings, ...settingsResponse.data });
        if (filesResponse.success) setFiles(filesResponse.data);
      })
      .catch(() => setStatus('No se pudo cargar la configuracion AI.'));
  }, []);

  async function save() {
    setStatus('Guardando configuracion...');
    const response = await fetch('/api/ai/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    setStatus(response.ok ? 'Configuracion AI guardada.' : 'No se pudo guardar la configuracion.');
  }

  async function upload(filesToUpload: FileList) {
    setStatus('Subiendo conocimiento...');
    for (const file of Array.from(filesToUpload)) {
      const form = new FormData();
      form.set('file', file);
      const response = await fetch('/api/ai/knowledge', { method: 'POST', body: form });
      const data = await response.json();
      if (data.success) setFiles((current) => [data.data, ...current]);
      else setStatus(data.error || 'No se pudo subir un archivo.');
    }
    setStatus('Base de conocimiento actualizada. La indexacion puede tardar unos minutos.');
  }

  async function removeFile(id: string) {
    const response = await fetch(`/api/ai/knowledge?id=${id}`, { method: 'DELETE' });
    if (response.ok) setFiles((current) => current.filter((file) => file.id !== id));
  }

  async function sendMessage() {
    const prompt = message.trim();
    if (!prompt) return;
    setMessage('');
    setLoading(true);
    setChat((current) => [...current, { role: 'user', text: prompt }]);
    try {
      const response = await fetch('/api/ai/playground', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt }),
      });
      const data = await response.json();
      setChat((current) => [...current, { role: 'bot', text: data.success ? data.data.answer : data.error || 'No pude responder ahora.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <p className="text-sm font-medium text-blue-600">Tenant AI</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--theme-sidebar-text,#64748b)]">
          Configura el cerebro, el conocimiento y el simulador del concierge que atendera conversaciones del negocio.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          <DashboardCard>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Comportamiento del Agente</h2>
                <p className="mt-1 text-sm text-[var(--theme-sidebar-text,#64748b)]">Instrucciones base y capacidades disponibles para el concierge.</p>
              </div>
              <button type="button" onClick={save} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
                Guardar
              </button>
            </div>
            <textarea
              value={settings.systemPrompt}
              onChange={(event) => setSettings((current) => ({ ...current, systemPrompt: event.target.value }))}
              rows={10}
              className="mt-6 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-900 outline-none ring-blue-100 placeholder:text-[var(--theme-sidebar-text,#94a3b8)] focus:ring-4"
              placeholder="Eres un asistente experto..."
            />
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
              <Toggle checked={settings.autoSchedule} onChange={(checked) => setSettings((current) => ({ ...current, autoSchedule: checked }))} label="Auto-agendar citas" />
              <Toggle checked={settings.answerFaq} onChange={(checked) => setSettings((current) => ({ ...current, answerFaq: checked }))} label="Responder preguntas frecuentes" />
              <Toggle checked={settings.humanHandoff} onChange={(checked) => setSettings((current) => ({ ...current, humanHandoff: checked }))} label="Transferir a humano" />
            </div>
            {status && <p className="mt-4 text-sm text-[var(--theme-sidebar-text,#64748b)]">{status}</p>}
          </DashboardCard>

          <DashboardCard>
            <h2 className="text-lg font-semibold text-slate-900">Base de Conocimiento</h2>
            <p className="mt-1 text-sm text-[var(--theme-sidebar-text,#64748b)]">Sube PDFs de precios, catalogos, politicas clinicas o documentos operativos.</p>
            <div className="mt-6">
              <Dropzone onFiles={upload} />
            </div>
            <div className="mt-6 space-y-3">
              {files.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-5 text-sm text-[var(--theme-sidebar-text,#64748b)]">Aun no hay archivos ingeridos.</div>
              ) : (
                files.map((file) => (
                  <div key={file.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{file.fileName}</p>
                      <p className="text-xs text-[var(--theme-sidebar-text,#64748b)]">{file.mimeType} · {file.status || 'processing'}</p>
                    </div>
                    <button type="button" onClick={() => removeFile(file.id)} className="rounded-xl px-3 py-2 text-sm text-[var(--theme-sidebar-text,#64748b)] hover:bg-slate-50 hover:text-red-600">
                      Eliminar
                    </button>
                  </div>
                ))
              )}
            </div>
          </DashboardCard>
        </div>

        <div className="space-y-6 xl:col-span-4">
          <DashboardCard>
            <h2 className="text-lg font-semibold text-slate-900">AI Health & Usage</h2>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-[var(--theme-sidebar-text,#64748b)]">Consultas atendidas</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{chat.filter((item) => item.role === 'user').length}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-4">
                <p className="text-xs text-emerald-700">Tasa de resolucion</p>
                <p className="mt-2 text-2xl font-semibold text-emerald-700">89%</p>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard>
            <h2 className="text-lg font-semibold text-slate-900">Playground / Test Bot</h2>
            <div className="mt-5 flex h-80 flex-col rounded-2xl bg-slate-50 p-4">
              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {chat.map((item, index) => (
                  <div key={index} className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${item.role === 'bot' ? 'bg-blue-600 text-white' : 'ml-auto bg-white text-slate-700 shadow-sm'}`}>
                    {item.text}
                  </div>
                ))}
                {loading && <div className="max-w-[70%] rounded-2xl bg-blue-600 px-4 py-3 text-sm text-white">Pensando...</div>}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && sendMessage()}
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="Prueba una pregunta..."
                />
                <button type="button" onClick={sendMessage} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                  Enviar
                </button>
              </div>
            </div>
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}
