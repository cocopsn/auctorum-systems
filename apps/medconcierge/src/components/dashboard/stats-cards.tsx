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
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      borderColor: 'border-l-blue-500',
      gradientFrom: 'from-blue-50/50',
      trend: '+5% vs anterior',
      trendUp: true,
    },
    {
      label: 'Esta semana',
      value: String(stats.weekCount),
      icon: CalendarCheck,
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
      borderColor: 'border-l-green-500',
      gradientFrom: 'from-green-50/50',
      trend: '+12% vs anterior',
      trendUp: true,
    },
    {
      label: 'No-shows (mes)',
      value: String(stats.monthNoShows),
      icon: UserX,
      iconBg: 'bg-red-50',
      iconColor: 'text-red-600',
      borderColor: 'border-l-red-500',
      gradientFrom: 'from-red-50/50',
      trend: '-3% vs anterior',
      trendUp: false,
    },
    {
      label: 'Ingresos (mes)',
      value: formatCurrency(stats.monthRevenue),
      icon: DollarSign,
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
      borderColor: 'border-l-purple-500',
      gradientFrom: 'from-purple-50/50',
      trend: '+8% vs anterior',
      trendUp: true,
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`bg-gradient-to-br ${card.gradientFrom} to-white rounded-xl border border-gray-200 border-l-4 ${card.borderColor} p-5 hover:shadow-md transition-shadow duration-200`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-500 truncate">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
              {/* Trend indicator */}
              <div className="flex items-center gap-1 mt-2">
                {card.trendUp ? (
                  <TrendingUp className="w-3 h-3 text-green-500" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-500" />
                )}
                <span className={`text-[10px] font-medium ${card.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                  {card.trend}
                </span>
              </div>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.iconBg} shrink-0`}>
              <card.icon className={`w-6 h-6 ${card.iconColor}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
