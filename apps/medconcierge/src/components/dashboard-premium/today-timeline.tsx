'use client'

import Link from 'next/link'

type Appt = {
  id: string
  patientId: string
  patientName: string
  patientPhone: string
  startTime: string
  endTime: string
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show' | string
  reason: string | null
  fee: string | number | null
}

const STATUS: Record<string, { label: string; tone: string }> = {
  scheduled: { label: 'Agendada',    tone: '#94a3b8' },
  confirmed: { label: 'Confirmada',  tone: '#0E7490' },
  completed: { label: 'Completada',  tone: '#16a34a' },
  cancelled: { label: 'Cancelada',   tone: '#dc2626' },
  no_show:   { label: 'No asistió',  tone: '#d97706' },
}

/**
 * Editorial timeline of today's appointments. Numbered like a magazine
 * spread: 01, 02, 03... A vertical hairline runs down the left column,
 * with a small status disc anchoring each entry. The patient name uses
 * the display serif for hierarchy.
 */
export function TodayTimeline({ appointments, dateLabel }: { appointments: Appt[]; dateLabel: string }) {
  return (
    <section className="today-timeline">
      <header className="today-timeline__header">
        <div>
          <p className="today-timeline__eyebrow">AGENDA DE HOY · {dateLabel}</p>
          <h2 className="today-timeline__title">
            <span className="today-timeline__count">{appointments.length}</span>
            {appointments.length === 1 ? ' cita' : ' citas'}
          </h2>
        </div>
        <Link href="/agenda" className="today-timeline__link">Ver semana →</Link>
      </header>

      {appointments.length === 0 ? (
        <div className="today-timeline__empty">
          <p>Hoy no tienes citas agendadas.</p>
          <Link href="/agenda" className="today-timeline__cta">+ Agendar cita</Link>
        </div>
      ) : (
        <ol className="today-timeline__list">
          {appointments.map((a, idx) => {
            const meta = STATUS[a.status] ?? STATUS.scheduled
            return (
              <li key={a.id} className="today-timeline__item" style={{ animationDelay: `${idx * 50}ms` }}>
                <div className="today-timeline__index">{String(idx + 1).padStart(2, '0')}</div>
                <div className="today-timeline__rail">
                  <span className="today-timeline__disc" style={{ background: meta.tone }} />
                </div>
                <div className="today-timeline__body">
                  <div className="today-timeline__time">
                    <span className="today-timeline__time-strong">{shortTime(a.startTime)}</span>
                    <span className="today-timeline__time-sep">→</span>
                    <span className="today-timeline__time-end">{shortTime(a.endTime)}</span>
                    <span className="today-timeline__status" style={{ color: meta.tone }}>{meta.label}</span>
                  </div>
                  <Link href={`/pacientes/${a.patientId}`} className="today-timeline__name">
                    {a.patientName}
                  </Link>
                  {a.reason ? <p className="today-timeline__reason">{a.reason}</p> : null}
                  <div className="today-timeline__actions">
                    <Link href={`/pacientes/${a.patientId}`} className="today-timeline__action">
                      <span aria-hidden>📋</span> Expediente
                    </Link>
                    {a.patientPhone ? (
                      <a href={`https://wa.me/${a.patientPhone.replace(/\D/g, '')}`} className="today-timeline__action" target="_blank" rel="noreferrer">
                        <span aria-hidden>💬</span> WhatsApp
                      </a>
                    ) : null}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      )}

      <style>{`
        .today-timeline {
          background: #FFFFFC;
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 14px;
          padding: 22px 22px 14px;
        }
        .today-timeline__header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.08);
          margin-bottom: 4px;
        }
        .today-timeline__eyebrow {
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.18em;
          color: rgba(15, 23, 42, 0.5);
          margin: 0 0 4px;
        }
        .today-timeline__title {
          font-family: 'Fraunces', serif;
          font-size: 28px;
          font-weight: 500;
          letter-spacing: -0.02em;
          margin: 0;
          color: rgb(15, 23, 42);
        }
        .today-timeline__count {
          font-feature-settings: 'lnum', 'tnum';
          font-weight: 600;
          color: #0E7490;
        }
        .today-timeline__link {
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 13px;
          color: #0E7490;
          text-decoration: none;
        }
        .today-timeline__link:hover { text-decoration: underline; }
        .today-timeline__list {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .today-timeline__item {
          display: grid;
          grid-template-columns: 32px 24px 1fr;
          gap: 8px;
          padding: 18px 0;
          border-bottom: 1px dashed rgba(15, 23, 42, 0.08);
          opacity: 0;
          animation: timeline-rise 500ms ease-out forwards;
        }
        .today-timeline__item:last-child { border-bottom: none; }
        .today-timeline__index {
          font-family: 'Fraunces', serif;
          font-feature-settings: 'lnum', 'tnum';
          font-style: italic;
          font-size: 14px;
          color: rgba(15, 23, 42, 0.35);
          padding-top: 2px;
        }
        .today-timeline__rail {
          position: relative;
          width: 24px;
        }
        .today-timeline__rail::before {
          content: '';
          position: absolute;
          left: 50%;
          top: -18px;
          bottom: -18px;
          width: 1px;
          background: rgba(15, 23, 42, 0.1);
        }
        .today-timeline__item:first-child .today-timeline__rail::before { top: 8px; }
        .today-timeline__item:last-child  .today-timeline__rail::before { bottom: 8px; }
        .today-timeline__disc {
          position: absolute;
          left: 50%;
          top: 8px;
          transform: translateX(-50%);
          width: 9px;
          height: 9px;
          border-radius: 50%;
          box-shadow: 0 0 0 3px #FFFFFC;
        }
        .today-timeline__time {
          display: flex;
          align-items: baseline;
          gap: 8px;
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 12.5px;
          color: rgba(15, 23, 42, 0.6);
        }
        .today-timeline__time-strong {
          font-family: 'Fraunces', serif;
          font-feature-settings: 'lnum', 'tnum';
          font-size: 18px;
          font-weight: 500;
          color: rgb(15, 23, 42);
          letter-spacing: -0.01em;
        }
        .today-timeline__time-sep { color: rgba(15, 23, 42, 0.25); }
        .today-timeline__status {
          margin-left: auto;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .today-timeline__name {
          display: block;
          font-family: 'Fraunces', serif;
          font-size: 19px;
          font-weight: 500;
          letter-spacing: -0.01em;
          color: rgb(15, 23, 42);
          margin-top: 2px;
          text-decoration: none;
        }
        .today-timeline__name:hover { color: #0E7490; }
        .today-timeline__reason {
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 13px;
          color: rgba(15, 23, 42, 0.6);
          margin: 4px 0 0;
        }
        .today-timeline__actions {
          display: flex;
          gap: 12px;
          margin-top: 8px;
        }
        .today-timeline__action {
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 12px;
          color: rgba(15, 23, 42, 0.65);
          padding: 4px 10px;
          border: 1px solid rgba(15, 23, 42, 0.12);
          border-radius: 8px;
          text-decoration: none;
          transition: all 150ms;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .today-timeline__action:hover {
          color: #0E7490;
          border-color: #0E7490;
          background: rgba(14, 116, 144, 0.04);
        }
        .today-timeline__empty {
          padding: 32px 0 16px;
          text-align: center;
          color: rgba(15, 23, 42, 0.5);
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 14px;
        }
        .today-timeline__cta {
          display: inline-block;
          margin-top: 12px;
          padding: 8px 16px;
          background: #0E7490;
          color: white;
          border-radius: 8px;
          font-size: 13px;
          text-decoration: none;
        }
        @keyframes timeline-rise {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  )
}

function shortTime(t: string | null): string {
  if (!t) return ''
  return t.length >= 5 ? t.substring(0, 5) : t
}
