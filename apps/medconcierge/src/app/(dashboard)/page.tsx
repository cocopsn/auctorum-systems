/**
 * Editorial-Medical dashboard. Composed entirely from the
 * `dashboard-premium/*` components. Server-side this page only fetches
 * `/api/dashboard/stats` (one round trip) and hands the data off to
 * client islands for animation.
 *
 * Direction:
 *   Typography — Fraunces (display serif) for numerals + headings,
 *                IBM Plex Sans for body & metadata. Both loaded from
 *                Google Fonts via <link> in this page so the dashboard
 *                doesn't drag the rest of the app into bigger CSS.
 *   Palette    — warm paper #FAF7F2 background, off-white #FFFFFC cards,
 *                slate-warm text, teal #0E7490 primary accent. Tints
 *                kept whisper-quiet so the data stays the hero.
 *   Layout     — asymmetric 2/3 + 1/3 grid. Numbered timeline on the
 *                left, activity feed + bot status + next actions on the
 *                right. Week chart spans full width below.
 */

export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { headers } from 'next/headers'

import { getAuthTenant } from '@/lib/auth'
import { KpiCard } from '@/components/dashboard-premium/kpi-card'
import { TodayTimeline } from '@/components/dashboard-premium/today-timeline'
import { ActivityFeed } from '@/components/dashboard-premium/activity-feed'
import { BotStatusPill } from '@/components/dashboard-premium/bot-status-pill'
import { WeekChart } from '@/components/dashboard-premium/week-chart'
import { NotificationBell } from '@/components/dashboard-premium/notification-bell'

type StatsResponse = {
  greeting: string
  tenantName: string
  kpis: {
    citasHoy: { label: string; value: number; delta: number; deltaLabel: string; spark: number[] }
    pacientes: { label: string; value: number; delta: number; deltaLabel: string; spark: number[] }
    asistencia: { label: string; value: number; unit: '%'; delta: number; deltaLabel: string; spark: number[] }
    revenue: { label: string; value: number; unit: 'centavos'; delta: number; deltaLabel: string; spark: number[] }
  }
  today: {
    date: string
    appointments: Array<{
      id: string
      patientId: string
      patientName: string
      patientPhone: string
      startTime: string
      endTime: string
      status: string
      reason: string | null
      fee: string | number | null
    }>
  }
  week: { from: string; to: string; rows: Array<{ date: string; status: string; count: number }> }
  activity: Array<{ type: string; id: string; title: string; subtitle: string | null; at: string }>
  bot: { online: boolean; status: string; processedToday: number; lastSeenAt: string | null }
}

async function fetchStats(): Promise<StatsResponse> {
  const h = headers()
  const host = h.get('host') ?? 'portal.auctorum.com.mx'
  const proto = h.get('x-forwarded-proto') ?? 'https'
  const cookie = h.get('cookie') ?? ''
  const res = await fetch(`${proto}://${host}/api/dashboard/stats`, {
    headers: { cookie },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`stats ${res.status}`)
  return (await res.json()) as StatsResponse
}

export default async function DashboardPage() {
  const auth = await getAuthTenant()
  if (!auth) redirect('/login')

  let data: StatsResponse | null = null
  let error: string | null = null
  try {
    data = await fetchStats()
  } catch (e) {
    error = e instanceof Error ? e.message : 'Error cargando stats'
  }

  const fullDate = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const shortDate = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })

  return (
    <div className="dash-root">
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@9..144,300..600,0..100&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
      />

      <header className="dash-header">
        <div className="dash-header__greeting">
          <p className="dash-header__date">{fullDate}</p>
          <h1 className="dash-header__title">
            {data?.greeting ?? 'Bienvenido'}, <em>{shortName(data?.tenantName ?? auth.tenant.name)}</em>
          </h1>
          {data ? (
            <div className="dash-header__bot">
              <BotStatusPill
                online={data.bot.online}
                processedToday={data.bot.processedToday}
                lastSeenAt={data.bot.lastSeenAt}
              />
            </div>
          ) : null}
        </div>
        <div className="dash-header__actions">
          <NotificationBell />
          <Link href="/settings" className="dash-header__icon" aria-label="Configuración">
            <SettingsIcon />
          </Link>
        </div>
      </header>

      {error ? (
        <div className="dash-error">
          <p>No pudimos cargar las métricas: {error}</p>
        </div>
      ) : null}

      {data ? (
        <section className="dash-kpis">
          <KpiCard kpi={data.kpis.citasHoy} delay={0} />
          <KpiCard kpi={data.kpis.pacientes} delay={80} />
          <KpiCard kpi={data.kpis.asistencia} delay={160} />
          <KpiCard kpi={data.kpis.revenue} delay={240} />
        </section>
      ) : null}

      {data ? (
        <section className="dash-grid">
          <div className="dash-grid__main">
            <TodayTimeline appointments={data.today.appointments} dateLabel={shortDate} />
          </div>
          <div className="dash-grid__aside">
            <ActivityFeed items={data.activity} />
            <QuickActions />
          </div>
        </section>
      ) : null}

      {data ? (
        <section className="dash-week">
          <WeekChart from={data.week.from} rows={data.week.rows} />
        </section>
      ) : null}

      <style>{`
        .dash-root {
          --dash-bg: #FAF7F2;
          --dash-card: #FFFFFC;
          --dash-text: rgb(15, 23, 42);
          --dash-text-muted: rgba(15, 23, 42, 0.6);
          --dash-accent: #0E7490;

          font-family: 'IBM Plex Sans', system-ui, sans-serif;
          background: var(--dash-bg);
          min-height: 100%;
          padding: 28px clamp(20px, 4vw, 40px) 60px;
          color: var(--dash-text);
        }
        .dash-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          padding-bottom: 20px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.08);
          margin-bottom: 28px;
        }
        .dash-header__date {
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(15, 23, 42, 0.5);
          margin: 0 0 6px;
        }
        .dash-header__title {
          font-family: 'Fraunces', serif;
          font-weight: 400;
          font-size: clamp(28px, 4vw, 38px);
          line-height: 1.1;
          letter-spacing: -0.02em;
          margin: 0;
        }
        .dash-header__title em {
          font-style: italic;
          font-weight: 400;
          color: var(--dash-accent);
        }
        .dash-header__bot { margin-top: 10px; }
        .dash-header__actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .dash-header__icon {
          width: 36px; height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: rgba(15, 23, 42, 0.6);
          border-radius: 8px;
          text-decoration: none;
        }
        .dash-header__icon:hover {
          color: var(--dash-text);
          background: rgba(15, 23, 42, 0.04);
        }
        .dash-error {
          padding: 14px 18px;
          background: #FEF2F2;
          border: 1px solid #FECACA;
          border-radius: 10px;
          color: #991B1B;
          margin-bottom: 18px;
        }
        .dash-kpis {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 14px;
          margin-bottom: 28px;
        }
        .dash-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr);
          gap: 24px;
          margin-bottom: 28px;
        }
        @media (max-width: 960px) {
          .dash-grid { grid-template-columns: 1fr; }
        }
        .dash-grid__aside {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
      `}</style>
    </div>
  )
}

function shortName(full: string): string {
  const cleaned = full.trim()
  if (cleaned.toLowerCase().startsWith('clinica ')) return cleaned.slice('clinica '.length)
  return cleaned.split(' ').slice(0, 3).join(' ')
}

function QuickActions() {
  return (
    <nav className="quick-actions" aria-label="Accesos rápidos">
      <p className="quick-actions__eyebrow">ACCIONES RÁPIDAS</p>
      <Link href="/agenda" className="quick-actions__btn quick-actions__btn--primary">
        + Agendar cita
      </Link>
      <Link href="/conversaciones" className="quick-actions__btn">Conversaciones</Link>
      <Link href="/reportes" className="quick-actions__btn">Reportes</Link>
      <Link href="/ai-settings" className="quick-actions__btn">Configurar bot</Link>
      <style>{`
        .quick-actions {
          background: #FFFFFC;
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 14px;
          padding: 22px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .quick-actions__eyebrow {
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.18em;
          color: rgba(15, 23, 42, 0.5);
          margin: 0 0 4px;
        }
        .quick-actions__btn {
          padding: 10px 14px;
          background: rgba(15, 23, 42, 0.03);
          color: rgb(15, 23, 42);
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 10px;
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 13px;
          text-decoration: none;
          transition: all 150ms;
        }
        .quick-actions__btn:hover {
          background: rgba(14, 116, 144, 0.06);
          border-color: rgba(14, 116, 144, 0.22);
          color: #0E7490;
        }
        .quick-actions__btn--primary {
          background: #0E7490;
          color: white;
          border-color: #0E7490;
          font-weight: 600;
        }
        .quick-actions__btn--primary:hover {
          background: #155e75;
          color: white;
          border-color: #155e75;
        }
      `}</style>
    </nav>
  )
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33 1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  )
}
