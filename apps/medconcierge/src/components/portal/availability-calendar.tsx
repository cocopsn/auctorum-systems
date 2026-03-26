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
  weekStart.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7) // Start on Monday

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
          className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
        <span className="text-lg font-bold text-gray-900">
          {MONTH_NAMES[weekStart.getMonth()]} {weekStart.getFullYear()}
        </span>
        <button
          onClick={() => setWeekOffset(Math.min(4, weekOffset + 1))}
          disabled={weekOffset >= 4}
          className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-gray-700" />
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
              className={`
                flex flex-col items-center p-3 min-h-[80px] rounded-xl text-sm transition-all duration-200
                ${isSelected
                  ? 'bg-tenant-primary text-white shadow-lg scale-105'
                  : hasAvailable && !isPast
                    ? 'bg-white border border-gray-200 hover:bg-green-50 hover:border-tenant-primary hover:shadow-sm cursor-pointer'
                    : 'bg-gray-50 text-gray-300 cursor-not-allowed opacity-40'
                }
              `}
            >
              <span className={`text-xs font-semibold uppercase tracking-wide ${isPast && !isSelected ? 'line-through' : ''}`}>
                {DAY_NAMES[day.getDay()]}
              </span>
              <span className={`text-xl font-bold mt-1.5 ${isPast && !isSelected ? 'line-through' : ''}`}>
                {day.getDate()}
              </span>
              {hasAvailable && !isPast && (
                <span className={`w-2 h-2 rounded-full mt-1.5 ${isSelected ? 'bg-white' : 'bg-green-400'}`} />
              )}
            </button>
          )
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div className="mt-8 text-center text-sm text-gray-400">Cargando disponibilidad...</div>
      )}

      {/* Slots */}
      {selectedDate && !loading && (
        <div className="mt-8">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">
            Horarios disponibles — {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h4>
          {availableSlots.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {availableSlots.map((slot) => (
                <button
                  key={slot.startTime}
                  onClick={() => onSlotSelect(selectedDate, slot)}
                  className="px-3 py-2.5 text-sm font-medium rounded-lg border-2 border-gray-200 bg-white hover:border-tenant-primary hover:bg-tenant-primary hover:text-white transition-all duration-200"
                >
                  {slot.startTime.slice(0, 5)}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No hay horarios disponibles este día.</p>
          )}
        </div>
      )}
    </div>
  )
}
