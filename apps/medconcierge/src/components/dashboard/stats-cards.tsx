import { CalendarDays, CalendarCheck, UserX, DollarSign } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

type Stats = {
  todayCount: number
  weekCount: number
  monthNoShows: number
  monthRevenue: number
}

export function StatsCards({ stats }: { stats: Stats }) {
  const cards = [
    { label: 'Citas hoy', value: String(stats.todayCount), icon: CalendarDays, color: 'bg-blue-50 text-blue-600' },
    { label: 'Esta semana', value: String(stats.weekCount), icon: CalendarCheck, color: 'bg-green-50 text-green-600' },
    { label: 'No-shows (mes)', value: String(stats.monthNoShows), icon: UserX, color: 'bg-red-50 text-red-600' },
    { label: 'Ingresos (mes)', value: formatCurrency(stats.monthRevenue), icon: DollarSign, color: 'bg-purple-50 text-purple-600' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.color}`}>
              <card.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="text-lg font-bold text-gray-900">{card.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
