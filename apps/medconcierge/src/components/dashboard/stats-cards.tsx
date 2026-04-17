import { CalendarDays, CalendarCheck, UserX, DollarSign, TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

type Stats = {
  todayCount: number
  weekCount: number
  monthNoShows: number
  monthRevenue: number
}

export function StatsCards({ stats }: { stats: Stats }) {
  const cards = [
    {
      label: 'Citas hoy',
      value: String(stats.todayCount),
      icon: CalendarDays,
      trend: '+5% vs anterior',
      trendUp: true,
    },
    {
      label: 'Esta semana',
      value: String(stats.weekCount),
      icon: CalendarCheck,
      trend: '+12% vs anterior',
      trendUp: true,
    },
    {
      label: 'No-shows (mes)',
      value: String(stats.monthNoShows),
      icon: UserX,
      trend: '-3% vs anterior',
      trendUp: false,
    },
    {
      label: 'Ingresos (mes)',
      value: formatCurrency(stats.monthRevenue),
      icon: DollarSign,
      trend: '+8% vs anterior',
      trendUp: true,
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--border-hover)] transition-colors"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-mono text-[var(--text-tertiary)] uppercase tracking-wide">{card.label}</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{card.value}</p>
              <div className="flex items-center gap-1 mt-2">
                {card.trendUp ? (
                  <TrendingUp className="w-3 h-3 text-[var(--success)]" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-[var(--error)]" />
                )}
                <span className={`text-[10px] font-medium ${card.trendUp ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
                  {card.trend}
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[var(--accent-muted)] flex items-center justify-center shrink-0">
              <card.icon className="w-5 h-5 text-[var(--accent)]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
