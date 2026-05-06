'use client'

type Activity = {
  type: 'appointment' | 'payment' | 'patient' | string
  id: string
  title: string
  subtitle: string | null
  at: string | null
}

const TYPE_META: Record<string, { dot: string; tag: string }> = {
  appointment: { dot: '#0E7490', tag: 'CITA' },
  payment:     { dot: '#16a34a', tag: 'PAGO' },
  patient:     { dot: '#a855f7', tag: 'PACIENTE' },
}

export function ActivityFeed({ items }: { items: Activity[] }) {
  return (
    <section className="activity-feed">
      <header className="activity-feed__header">
        <p className="activity-feed__eyebrow">ACTIVIDAD RECIENTE</p>
      </header>
      {items.length === 0 ? (
        <p className="activity-feed__empty">Sin actividad reciente.</p>
      ) : (
        <ul className="activity-feed__list">
          {items.map((it, idx) => {
            const meta = TYPE_META[it.type] ?? { dot: '#94a3b8', tag: 'EVENTO' }
            return (
              <li key={`${it.type}-${it.id}`} className="activity-feed__item" style={{ animationDelay: `${idx * 35}ms` }}>
                <span className="activity-feed__dot" style={{ background: meta.dot }} />
                <div className="activity-feed__body">
                  <div className="activity-feed__top">
                    <span className="activity-feed__tag">{meta.tag}</span>
                    <span className="activity-feed__time">{relativeTime(it.at)}</span>
                  </div>
                  <p className="activity-feed__title">{it.title}</p>
                  {it.subtitle ? <p className="activity-feed__subtitle">{it.subtitle}</p> : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <style>{`
        .activity-feed {
          background: #FFFFFC;
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 14px;
          padding: 22px;
        }
        .activity-feed__header {
          padding-bottom: 14px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.08);
        }
        .activity-feed__eyebrow {
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.18em;
          color: rgba(15, 23, 42, 0.5);
          margin: 0;
        }
        .activity-feed__empty {
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 13px;
          color: rgba(15, 23, 42, 0.5);
          padding: 16px 0;
          text-align: center;
        }
        .activity-feed__list {
          list-style: none;
          margin: 0;
          padding: 12px 0 0;
        }
        .activity-feed__item {
          display: grid;
          grid-template-columns: 14px 1fr;
          gap: 12px;
          padding: 10px 0;
          opacity: 0;
          animation: feed-rise 400ms ease-out forwards;
        }
        .activity-feed__dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-top: 6px;
          align-self: flex-start;
        }
        .activity-feed__top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 2px;
        }
        .activity-feed__tag {
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.15em;
          color: rgba(15, 23, 42, 0.55);
        }
        .activity-feed__time {
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 10.5px;
          letter-spacing: 0.04em;
          color: rgba(15, 23, 42, 0.4);
          text-transform: uppercase;
        }
        .activity-feed__title {
          font-family: 'Fraunces', serif;
          font-size: 14px;
          font-weight: 500;
          color: rgb(15, 23, 42);
          margin: 0;
          letter-spacing: -0.005em;
        }
        .activity-feed__subtitle {
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 12px;
          color: rgba(15, 23, 42, 0.55);
          margin: 2px 0 0;
        }
        @keyframes feed-rise {
          from { opacity: 0; transform: translateX(-2px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </section>
  )
}

function relativeTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const diffSec = Math.round((Date.now() - d.getTime()) / 1000)
  if (diffSec < 60) return 'ahora'
  if (diffSec < 3600) return `${Math.round(diffSec / 60)} min`
  if (diffSec < 86_400) return `${Math.round(diffSec / 3600)} h`
  if (diffSec < 86_400 * 7) return `${Math.round(diffSec / 86_400)} d`
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}
