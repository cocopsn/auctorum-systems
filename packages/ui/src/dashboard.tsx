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
} from 'lucide-react';
import { useEffect, useState } from 'react';

export type DashboardNavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

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
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-50 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-40 bg-gray-900/30 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-100 bg-white transition-transform duration-300 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center gap-3 border-b border-gray-100 px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white">
            AS
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900">{brand}</p>
            <p className="truncate text-xs text-gray-500">{appName}</p>
          </div>
          <button
            type="button"
            className="ml-auto rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-700 lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5" aria-label="Menu principal">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-xl border-l-4 px-4 py-3 text-sm transition ${
                  active
                    ? 'border-indigo-600 bg-gray-50 font-medium text-gray-900'
                    : 'border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-indigo-600' : 'text-gray-400'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-100 p-4">
          <div className="flex items-center gap-3 rounded-2xl bg-gray-50 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
              {userName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">{userName}</p>
              <p className="truncate text-xs text-gray-500">{planLabel}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </div>
          <form action={logoutAction} method="POST" className="mt-3">
            <button type="submit" className="w-full rounded-xl px-3 py-2 text-left text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-900">
              Cerrar sesion
            </button>
          </form>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-64">
        <TopHeader greeting={greeting} subtitle={subtitle} ctaHref={ctaHref} />
        <main className="min-h-screen bg-gray-50 p-5 pt-6 sm:p-8">{children}</main>
      </div>
    </div>
  );
}

export function TopHeader({ greeting, subtitle, ctaHref }: { greeting: string; subtitle: string; ctaHref: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/80 backdrop-blur">
      <div className="flex min-h-16 flex-col gap-4 px-5 py-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="ml-12 lg:ml-0">
          <p className="text-xs font-medium text-gray-500">Dashboard</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">{greeting}</h1>
          <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex h-11 min-w-[220px] flex-1 items-center gap-2 rounded-full border border-gray-100 bg-gray-50 px-4 text-sm text-gray-500 lg:flex-none">
            <Search className="h-4 w-4" />
            <input className="w-full bg-transparent outline-none placeholder:text-gray-400" placeholder="Search here..." />
          </label>
          <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gray-100 bg-white text-gray-600 shadow-sm">
            <Bell className="h-4 w-4" />
          </button>
          <Link
            href={ctaHref}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 text-sm font-semibold text-white shadow-sm"
          >
            <Sparkles className="h-4 w-4" />
            Get AI Insight
          </Link>
        </div>
      </div>
    </header>
  );
}

export function DashboardCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-gray-100 bg-white p-6 shadow-sm ${className}`}>{children}</section>;
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
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-gray-600">
          <Icon className="h-5 w-5" />
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${positive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
          {trend}
        </span>
      </div>
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">{value}</p>
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
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        </div>
        <div className="flex gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-indigo-500" />{seriesA}</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-300" />{seriesB}</span>
        </div>
      </div>
      <svg viewBox="0 0 700 260" className="h-64 w-full overflow-visible">
        {[40, 95, 150, 205].map((y) => (
          <line key={y} x1="32" x2="670" y1={y} y2={y} stroke="#f3f4f6" strokeWidth="2" />
        ))}
        <path d="M45 200 C95 70 125 70 165 110 S240 150 275 85 S360 60 405 125 S500 180 545 105 S610 70 660 95" fill="none" stroke="#6366f1" strokeWidth="5" strokeLinecap="round" />
        <path d="M45 210 C120 180 140 120 190 150 S275 225 335 160 S430 80 480 135 S575 210 660 155" fill="none" stroke="#fdba74" strokeWidth="4" strokeLinecap="round" opacity="0.9" />
        {['Mar 1', 'Mar 5', 'Mar 10', 'Mar 15', 'Mar 20', 'Mar 25', 'Mar 31'].map((label, index) => (
          <text key={label} x={52 + index * 100} y="250" fill="#9ca3af" fontSize="14">{label}</text>
        ))}
      </svg>
    </DashboardCard>
  );
}

export function DonutCard({ title, label, value }: { title: string; label: string; value: string }) {
  return (
    <DashboardCard className="min-h-[300px]">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      <p className="mt-1 text-sm text-gray-500">Distribution</p>
      <div className="mt-8 flex items-center justify-center">
        <div className="relative h-44 w-44 rounded-full bg-[conic-gradient(#6366f1_0_58%,#eef2ff_58%_78%,#f3f4f6_78%_100%)]">
          <div className="absolute inset-8 flex flex-col items-center justify-center rounded-full bg-white shadow-sm">
            <span className="text-sm text-gray-500">{label}</span>
            <span className="text-2xl font-semibold text-gray-900">{value}</span>
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
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <p className="mt-1 text-sm text-gray-500">Best performers</p>
        </div>
        <span className="text-xs font-medium text-indigo-600">View All</span>
      </div>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.label} className="rounded-2xl bg-gray-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.label}</p>
                <p className="mt-1 text-xs text-gray-500">{item.meta}</p>
              </div>
              <p className="text-lg font-semibold text-gray-900">{item.value}</p>
            </div>
            <div className="mt-4 h-2 rounded-full bg-white">
              <div className="h-2 rounded-full bg-indigo-600" style={{ width: `${item.progress}%` }} />
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
    danger: 'bg-rose-50 text-rose-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    neutral: 'bg-gray-100 text-gray-600',
  }[tone];
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${colors}`}>{children}</span>;
}

export function AiInsightCard({ insights, href = '/dashboard/ai-settings' }: { insights: Array<{ title: string; body: string }>; href?: string }) {
  return (
    <DashboardCard>
      <h2 className="text-base font-semibold text-gray-900">AI Insights</h2>
      <div className="mt-5 space-y-3">
        {insights.map((insight) => (
          <div key={insight.title} className="rounded-2xl bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-900">{insight.title}</p>
            <p className="mt-1 line-clamp-2 text-sm text-gray-500">{insight.body}</p>
          </div>
        ))}
      </div>
      <Link href={href} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3 text-sm font-semibold text-white">
        <Sparkles className="h-4 w-4" />
        Open AI Assistant
      </Link>
    </DashboardCard>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-4 rounded-xl border border-gray-100 bg-white px-4 py-3 text-left">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <span className={`flex h-6 w-11 items-center rounded-full p-1 transition ${checked ? 'bg-indigo-600' : 'bg-gray-200'}`}>
        <span className={`h-4 w-4 rounded-full bg-white shadow-sm transition ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </span>
    </button>
  );
}

export function Dropzone({ onFiles }: { onFiles: (files: FileList) => void }) {
  return (
    <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center transition hover:border-indigo-200 hover:bg-indigo-50/40">
      <UploadCloud className="h-8 w-8 text-indigo-500" />
      <span className="mt-3 text-sm font-medium text-gray-900">Arrastra archivos o haz clic para subir</span>
      <span className="mt-1 text-xs text-gray-500">PDF, TXT, Markdown o DOCX. Maximo 20MB.</span>
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
        <p className="text-sm font-medium text-indigo-600">Tenant AI</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-500">
          Configura el cerebro, el conocimiento y el simulador del concierge que atendera conversaciones del negocio.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          <DashboardCard>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Comportamiento del Agente</h2>
                <p className="mt-1 text-sm text-gray-500">Instrucciones base y capacidades disponibles para el concierge.</p>
              </div>
              <button type="button" onClick={save} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700">
                Guardar
              </button>
            </div>
            <textarea
              value={settings.systemPrompt}
              onChange={(event) => setSettings((current) => ({ ...current, systemPrompt: event.target.value }))}
              rows={10}
              className="mt-6 w-full rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-900 outline-none ring-indigo-100 placeholder:text-gray-400 focus:ring-4"
              placeholder="Eres un asistente experto..."
            />
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
              <Toggle checked={settings.autoSchedule} onChange={(checked) => setSettings((current) => ({ ...current, autoSchedule: checked }))} label="Auto-agendar citas" />
              <Toggle checked={settings.answerFaq} onChange={(checked) => setSettings((current) => ({ ...current, answerFaq: checked }))} label="Responder preguntas frecuentes" />
              <Toggle checked={settings.humanHandoff} onChange={(checked) => setSettings((current) => ({ ...current, humanHandoff: checked }))} label="Transferir a humano" />
            </div>
            {status && <p className="mt-4 text-sm text-gray-500">{status}</p>}
          </DashboardCard>

          <DashboardCard>
            <h2 className="text-lg font-semibold text-gray-900">Base de Conocimiento</h2>
            <p className="mt-1 text-sm text-gray-500">Sube PDFs de precios, catalogos, politicas clinicas o documentos operativos.</p>
            <div className="mt-6">
              <Dropzone onFiles={upload} />
            </div>
            <div className="mt-6 space-y-3">
              {files.length === 0 ? (
                <div className="rounded-2xl bg-gray-50 p-5 text-sm text-gray-500">Aun no hay archivos ingeridos.</div>
              ) : (
                files.map((file) => (
                  <div key={file.id} className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{file.fileName}</p>
                      <p className="text-xs text-gray-500">{file.mimeType} · {file.status || 'processing'}</p>
                    </div>
                    <button type="button" onClick={() => removeFile(file.id)} className="rounded-xl px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 hover:text-rose-600">
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
            <h2 className="text-lg font-semibold text-gray-900">AI Health & Usage</h2>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs text-gray-500">Consultas atendidas</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">{chat.filter((item) => item.role === 'user').length}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-4">
                <p className="text-xs text-emerald-700">Tasa de resolucion</p>
                <p className="mt-2 text-2xl font-semibold text-emerald-700">89%</p>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard>
            <h2 className="text-lg font-semibold text-gray-900">Playground / Test Bot</h2>
            <div className="mt-5 flex h-80 flex-col rounded-2xl bg-gray-50 p-4">
              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {chat.map((item, index) => (
                  <div key={index} className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${item.role === 'bot' ? 'bg-indigo-600 text-white' : 'ml-auto bg-white text-gray-700 shadow-sm'}`}>
                    {item.text}
                  </div>
                ))}
                {loading && <div className="max-w-[70%] rounded-2xl bg-indigo-600 px-4 py-3 text-sm text-white">Pensando...</div>}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && sendMessage()}
                  className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-100"
                  placeholder="Prueba una pregunta..."
                />
                <button type="button" onClick={sendMessage} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
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
