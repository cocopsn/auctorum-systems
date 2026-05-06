import { Sparkline } from './sparkline'

type Kpi = {
  label: string
  value: number
  unit?: 'centavos' | '%'
  delta: number
  deltaLabel: string
  spark: number[]
}

/**
 * Editorial KPI card: serif numeral + small-caps label + ruled separator
 * + sparkline. The big number is the visual hero. Trend is a subtle line
 * underneath, not a colored pill, so the dashboard reads as a journal
 * rather than a startup analytics tile.
 */
export function KpiCard({ kpi, accent = '#0E7490', delay = 0 }: { kpi: Kpi; accent?: string; delay?: number }) {
  const formatted = formatValue(kpi)
  const deltaSign =
    kpi.delta > 0 ? '+' : kpi.delta < 0 ? '−' : '·'
  const deltaText =
    kpi.delta === 0
      ? `Sin cambio · ${kpi.deltaLabel}`
      : `${deltaSign}${Math.abs(kpi.delta).toLocaleString('es-MX')} ${kpi.deltaLabel}`
  const deltaColor =
    kpi.delta > 0 ? 'text-emerald-700' : kpi.delta < 0 ? 'text-rose-700' : 'text-stone-500'

  return (
    <div
      className="kpi-card"
      style={{
        animation: `kpi-rise 600ms ease-out ${delay}ms both`,
      }}
    >
      <div className="kpi-card__label">{kpi.label}</div>
      <div className="kpi-card__rule" />
      <div className="kpi-card__value">{formatted}</div>
      <div className="kpi-card__row">
        <span className={`kpi-card__delta ${deltaColor}`}>{deltaText}</span>
        <Sparkline data={kpi.spark} color={accent} />
      </div>
      <style>{`
        .kpi-card {
          background: var(--kpi-card-bg, #FFFFFC);
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 12px;
          padding: 18px 18px 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          position: relative;
          overflow: hidden;
        }
        .kpi-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(at 100% 0%, ${accent}10 0%, transparent 50%);
          pointer-events: none;
        }
        .kpi-card__label {
          font-family: var(--font-sans, 'IBM Plex Sans', sans-serif);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(15, 23, 42, 0.55);
        }
        .kpi-card__rule {
          height: 1px;
          background: linear-gradient(to right, rgba(15,23,42,0.18), transparent);
          margin: 2px 0;
        }
        .kpi-card__value {
          font-family: var(--font-serif, 'Fraunces', 'Times New Roman', serif);
          font-feature-settings: 'lnum', 'tnum';
          font-weight: 500;
          font-size: 38px;
          line-height: 1.05;
          letter-spacing: -0.02em;
          color: rgb(15, 23, 42);
        }
        .kpi-card__row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 6px;
          gap: 12px;
        }
        .kpi-card__delta {
          font-family: var(--font-sans, 'IBM Plex Sans', sans-serif);
          font-size: 11.5px;
          font-weight: 500;
          letter-spacing: 0.01em;
        }
        @keyframes kpi-rise {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

function formatValue(kpi: Kpi): string {
  if (kpi.unit === 'centavos') {
    const pesos = (kpi.value ?? 0) / 100
    return pesos.toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0,
    })
  }
  if (kpi.unit === '%') return `${kpi.value}%`
  return Number(kpi.value ?? 0).toLocaleString('es-MX')
}
