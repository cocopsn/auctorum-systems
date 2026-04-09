'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type Slot = {
  startTime: string
  endTime: string
  available: boolean
}

type DateAvailability = {
  date: string
  slots: Slot[]
}

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export function AvailabilityCalendar({
  tenantId,
  onSlotSelect,
}: {
  tenantId: string
  onSlotSelect: (date: string, slot: Slot) => void
}) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [dates, setDates] = useState<DateAvailability[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const today = new Date()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7)

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  useEffect(() => {
    setLoading(true)
    const startDate = weekStart.toISOString().split('T')[0]
    const endDate = weekEnd.toISOString().split('T')[0]

    fetch(`/api/availability?tenantId=${tenantId}&startDate=${startDate}&endDate=${endDate}`)
      .then((res) => res.json())
      .then((data) => {
        setDates(data.dates ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [weekOffset, tenantId])

  const weekDays: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    weekDays.push(d)
  }

  const selectedDateData = dates.find((d) => d.date === selectedDate)
  const availableSlots = selectedDateData?.slots.filter((s) => s.available) ?? []

  return (
    <div>
      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
          disabled={weekOffset === 0}
          className="p-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          {MONTH_NAMES[weekStart.getMonth()]} {weekStart.getFullYear()}
        </span>
        <button
          onClick={() => setWeekOffset(Math.min(4, weekOffset + 1))}
          disabled={weekOffset >= 4}
          className="p-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day Grid */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const dateStr = day.toISOString().split('T')[0]
          const dateData = dates.find((d) => d.date === dateStr)
          const hasAvailable = dateData?.slots.some((s) => s.available)
          const isPast = day < today && dateStr !== today.toISOString().split('T')[0]
          const isSelected = dateStr === selectedDate

          return (
            <button
              key={dateStr}
              onClick={() => {
                if (hasAvailable && !isPast) setSelectedDate(dateStr)
              }}
              disabled={!hasAvailable || isPast}
              className={`flex flex-col items-center p-2.5 min-h-[72px] rounded-lg text-sm transition-all
                ${isSelected
                  ? 'bg-[var(--accent)] text-white'
                  : hasAvailable && !isPast
                    ? 'bg-[var(--bg-tertiary)] border border-[var(--border)] hover:border-[var(--accent)] cursor-pointer'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-tertiary)]/30 cursor-not-allowed'
                }`}
            >
              <span className={`text-[11px] font-medium uppercase tracking-wide ${isPast && !isSelected ? 'line-through' : ''}`}>
                {DAY_NAMES[day.getDay()]}
              </span>
              <span className={`text-lg font-bold mt-1 ${isPast && !isSelected ? 'line-through' : ''}`}>
                {day.getDate()}
              </span>
              {hasAvailable && !isPast && (
                <span className={`w-1.5 h-1.5 rounded-full mt-1 ${isSelected ? 'bg-white' : 'bg-[var(--success)]'}`} />
              )}
            </button>
          )
        })}
      </div>

      {loading && (
        <div
          role="status"
          aria-label="Cargando disponibilidad"
          className="mt-6 grid grid-cols-3 sm:grid-cols-4 gap-2 animate-pulse"
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-10 rounded-lg bg-[var(--bg-tertiary)]" />
          ))}
        </div>
      )}

      {selectedDate && !loading && (
        <div className="mt-6">
          <h4 className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide mb-3">
            Horarios disponibles — {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h4>
          {availableSlots.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {availableSlots.map((slot) => (
                <button
                  key={slot.startTime}
                  onClick={() => onSlotSelect(selectedDate, slot)}
                  className="px-3 py-2 text-sm font-mono font-medium rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-all"
                >
                  {slot.startTime.slice(0, 5)}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[var(--text-tertiary)]">No hay horarios disponibles este día.</p>
          )}
        </div>
      )}
    </div>
  )
}
