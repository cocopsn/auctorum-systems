'use client'

type WeekRow = { date: string; status: string; count: number }

const STATUS_ORDER = ['confirmed', 'completed', 'scheduled', 'cancelled', 'no_show'] as const
const STATUS_TONE: Record<string, string> = {
  confirmed: '#0E7490',
  completed: '#16a34a',
  scheduled: '#cbd5e1',
  cancelled: '#dc2626',
  no_show:   '#d97706',
}
const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Confirmadas',
  completed: 'Completadas',
  scheduled: 'Pendientes',
  cancelled: 'Canceladas',
  no_show:   'No-show',
}
const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

/**
 * Week chart: stacked horizontal bars per weekday with a status legend.
 * Editorial tone — no axis lines or chart noise; just bars and labels.
 */
export function WeekChart({ from, rows }: { from: string; rows: WeekRow[] }) {
  // 7 day buckets
  const days: Array<{ key: string; label: string; date: string; bars: Array<{ status: string; count: number }>; total: number }> = []
  const start = new Date(from + 'T00:00:00Z')
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setUTCDate(start.getUTCDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    const dayBars = rows.filter((r) => r.date === dateStr)
    days.push({
      key: dateStr,
      label: DAY_LABELS[i],
      date: dateStr,
      bars: dayBars.map((b) => ({ status: b.status, count: Number(b.count) })),
      total: dayBars.reduce((s, b) => s + Number(b.count), 0),
    })
  }
  const max = Math.max(1, ...days.map((d) => d.total))
  const today = new Date().toISOString().split('T')[0]

  return (
    <section className="week-chart">
      <header className="week-chart__header">
        <p className="week-chart__eyebrow">SEMANA EN CURSO</p>
        <Legend />
      </header>
      <div className="week-chart__rows">
        {days.map((d) => (
          <div key={d.key} className={`week-chart__row ${d.date === today ? 'is-today' : ''}`}>
            <div className="week-chart__label">
              <span className="week-chart__day">{d.label}</span>
              <span className="week-chart__date">{d.date.slice(8)}</span>
            </div>
            <div className="week-chart__bar">
              {STATUS_ORDER.map((s) => {
                const c = d.bars.find((b) => b.status === s)?.count ?? 0
                if (c <= 0) return null
                return (
                  <span
                    key={s}
                    className="week-chart__seg"
                    style={{ width: `${(c / max) * 100}%`, background: STATUS_TONE[s] }}
                    title={`${STATUS_LABEL[s] ?? s}: ${c}`}
                  />
                )
              })}
            </div>
            <span className="week-chart__total">{d.total > 0 ? d.total : '—'}</span>
          </div>
        ))}
      </div>
      <style>{`
        .week-chart {
          background: #FFFFFC;
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 14px;
          padding: 22px;
        }
        .week-chart__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 14px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.08);
          margin-bottom: 14px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .week-chart__eyebrow {
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.18em;
          color: rgba(15, 23, 42, 0.5);
          margin: 0;
        }
        .week-chart__rows {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .week-chart__row {
          display: grid;
          grid-template-columns: 56px 1fr 32px;
          gap: 12px;
          align-items: center;
        }
        .week-chart__row.is-today .week-chart__day { color: #0E7490; font-weight: 700; }
        .week-chart__label {
          display: flex;
          align-items: baseline;
          gap: 6px;
          font-family: 'IBM Plex Sans', sans-serif;
        }
        .week-chart__day {
          font-size: 12px;
          font-weight: 500;
          color: rgba(15, 23, 42, 0.7);
        }
        .week-chart__date {
          font-family: 'Fraunces', serif;
          font-feature-settings: 'lnum', 'tnum';
          font-size: 11px;
          color: rgba(15, 23, 42, 0.4);
        }
        .week-chart__bar {
          display: flex;
          height: 14px;
          background: rgba(15, 23, 42, 0.04);
          border-radius: 999px;
          overflow: hidden;
          gap: 2px;
        }
        .week-chart__seg {
          display: block;
          height: 100%;
          transition: width 600ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .week-chart__total {
          font-family: 'Fraunces', serif;
          font-feature-settings: 'lnum', 'tnum';
          font-size: 14px;
          color: rgb(15, 23, 42);
          text-align: right;
        }
      `}</style>
    </section>
  )
}

function Legend() {
  return (
    <div className="legend">
      {STATUS_ORDER.map((s) => (
        <span key={s} className="legend__item">
          <span className="legend__dot" style={{ background: STATUS_TONE[s] }} />
          {STATUS_LABEL[s]}
        </span>
      ))}
      <style>{`
        .legend {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 11px;
          color: rgba(15, 23, 42, 0.55);
        }
        .legend__item { display: inline-flex; align-items: center; gap: 6px; }
        .legend__dot { width: 8px; height: 8px; border-radius: 2px; display: inline-block; }
      `}</style>
    </div>
  )
}
