'use client'

import { useState, useEffect, useCallback } from 'react'
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

const DAY_NAMES = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function toLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export function AvailabilityCalendar({
  tenantId,
  onSlotSelect,
}: {
  tenantId: string
  onSlotSelect: (date: string, slot: Slot) => void
}) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [availableDatesMap, setAvailableDatesMap] = useState<Record<string, boolean>>({})
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [daySlots, setDaySlots] = useState<Slot[]>([])
  const [loadingMonth, setLoadingMonth] = useState(true)
  const [loadingSlots, setLoadingSlots] = useState(false)

  const today = new Date()
  const todayStr = toLocalDate(today)

  // Fetch month availability
  useEffect(() => {
    setLoadingMonth(true)
    const firstDay = new Date(currentMonth.year, currentMonth.month, 1)
    const lastDay = new Date(currentMonth.year, currentMonth.month + 1, 0)
    const startDate = toLocalDate(firstDay)
    const endDate = toLocalDate(lastDay)

    fetch(`/api/availability?tenantId=${tenantId}&startDate=${startDate}&endDate=${endDate}`)
      .then((res) => res.json())
      .then((data) => {
        const map: Record<string, boolean> = {}
        for (const d of (data.dates ?? [])) {
          const hasAvailable = d.slots?.some((s: Slot) => s.available)
          if (hasAvailable) map[d.date] = true
        }
        setAvailableDatesMap(map)
        setLoadingMonth(false)
      })
      .catch(() => setLoadingMonth(false))
  }, [currentMonth, tenantId])

  // Fetch day slots when a date is selected
  useEffect(() => {
    if (!selectedDate) { setDaySlots([]); return }
    setLoadingSlots(true)
    fetch(`/api/availability?tenantId=${tenantId}&startDate=${selectedDate}&endDate=${selectedDate}`)
      .then((res) => res.json())
      .then((data) => {
        const dateData = (data.dates ?? []).find((d: DateAvailability) => d.date === selectedDate)
        setDaySlots(dateData?.slots?.filter((s: Slot) => s.available) ?? [])
        setLoadingSlots(false)
      })
      .catch(() => setLoadingSlots(false))
  }, [selectedDate, tenantId])

  const navigateMonth = useCallback((dir: number) => {
    setCurrentMonth((prev) => {
      let m = prev.month + dir
      let y = prev.year
      if (m < 0) { m = 11; y-- }
      if (m > 11) { m = 0; y++ }
      return { year: y, month: m }
    })
    setSelectedDate(null)
    setDaySlots([])
  }, [])

  // Build calendar grid
  const firstDayOfMonth = new Date(currentMonth.year, currentMonth.month, 1)
  const daysInMonth = new Date(currentMonth.year, currentMonth.month + 1, 0).getDate()
  // Monday = 0
  let startDow = firstDayOfMonth.getDay() - 1
  if (startDow < 0) startDow = 6

  const cells: (number | null)[] = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const canGoPrev = currentMonth.year > today.getFullYear() || currentMonth.month > today.getMonth()

  const isCurrentMonthToday = currentMonth.year === today.getFullYear() && currentMonth.month === today.getMonth()

  return (
    <div>
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => navigateMonth(-1)}
          disabled={!canGoPrev}
          className="p-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          {MONTH_NAMES[currentMonth.month]} {currentMonth.year}
        </span>
        <button
          onClick={() => navigateMonth(1)}
          className="p-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) {
            return <div key={`empty-${i}`} className="h-10" />
          }

          const dateStr = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isPast = dateStr < todayStr
          const isToday = dateStr === todayStr
          const hasAvailability = !!availableDatesMap[dateStr]
          const isSelected = dateStr === selectedDate
          const isSunday = (i % 7) === 6

          const disabled = isPast || !hasAvailability || isSunday

          return (
            <button
              key={dateStr}
              onClick={() => { if (!disabled) setSelectedDate(dateStr) }}
              disabled={disabled}
              className={`relative h-10 rounded-lg text-sm font-medium transition-all
                ${isSelected
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : isToday
                    ? 'ring-2 ring-[var(--accent)] text-[var(--accent)] bg-[var(--bg-tertiary)]'
                    : hasAvailability && !isPast && !isSunday
                      ? 'text-[var(--text-primary)] hover:bg-[var(--accent-muted)] cursor-pointer'
                      : 'text-[var(--text-tertiary)]/40 cursor-not-allowed'
                }`}
            >
              {day}
              {hasAvailability && !isPast && !isSunday && !isSelected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--success)]" />
              )}
            </button>
          )
        })}
      </div>

      {/* Loading indicator for month */}
      {loadingMonth && (
        <div className="mt-4 flex justify-center">
          <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Time Slots */}
      {selectedDate && (
        <div className="mt-6">
          <h4 className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide mb-3">
            Horarios disponibles &mdash;{' '}
            {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-MX', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </h4>

          {loadingSlots ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 animate-pulse">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-10 rounded-lg bg-[var(--bg-tertiary)]" />
              ))}
            </div>
          ) : daySlots.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {daySlots.map((slot) => (
                <button
                  key={slot.startTime}
                  onClick={() => onSlotSelect(selectedDate, slot)}
                  className="px-3 py-2.5 text-sm font-mono font-medium rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-all"
                >
                  {slot.startTime.slice(0, 5)}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[var(--text-tertiary)]">No hay horarios disponibles este dia.</p>
          )}
        </div>
      )}
    </div>
  )
}
