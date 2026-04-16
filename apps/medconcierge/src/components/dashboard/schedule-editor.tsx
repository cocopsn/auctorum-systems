'use client'

import { useState, useEffect } from 'react'
import { Save, Loader2 } from 'lucide-react'

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

type DaySchedule = {
  dayOfWeek: number
  isActive: boolean
  startTime: string
  endTime: string
  slotDurationMin: number
  location: string
}

export function ScheduleEditor() {
  const [days, setDays] = useState<DaySchedule[]>(
    Array.from({ length: 7 }, (_, i) => ({
      dayOfWeek: i,
      isActive: false,
      startTime: '09:00',
      endTime: '14:00',
      slotDurationMin: 30,
      location: '',
    }))
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/dashboard/schedules')
      .then((res) => res.json())
      .then((data) => {
        if (data.schedules?.length > 0) {
          setDays((prev) =>
            prev.map((day) => {
              const found = data.schedules.find((s: DaySchedule) => s.dayOfWeek === day.dayOfWeek)
              if (found) {
                return {
                  ...day,
                  isActive: found.isActive ?? true,
                  startTime: found.startTime?.slice(0, 5) ?? '09:00',
                  endTime: found.endTime?.slice(0, 5) ?? '14:00',
                  slotDurationMin: found.slotDurationMin ?? 30,
                  location: found.location ?? '',
                }
              }
              return day
            })
          )
        }
      })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)

    const activeSchedules = days
      .filter((d) => d.isActive)
      .map((d) => ({
        dayOfWeek: d.dayOfWeek,
        startTime: d.startTime + ':00',
        endTime: d.endTime + ':00',
        slotDurationMin: d.slotDurationMin,
        isActive: true,
        location: d.location,
      }))

    await fetch('/api/dashboard/schedules', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schedules: activeSchedules }),
    })

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const updateDay = (index: number, updates: Partial<DaySchedule>) => {
    setDays((prev) =>
      prev.map((d, i) => (i === index ? { ...d, ...updates } : d))
    )
  }

  const inputClass = 'px-2 py-1 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30'

  return (
    <div>
      <div className="space-y-3">
        {days.map((day, i) => (
          <div
            key={day.dayOfWeek}
            className={`bg-[var(--bg-secondary)] rounded-xl border p-4 transition-colors ${
              day.isActive ? 'border-[var(--border)]' : 'border-[var(--border)] opacity-60'
            }`}
          >
            <div className="flex items-center gap-4">
              {/* Toggle */}
              <button
                onClick={() => updateDay(i, { isActive: !day.isActive })}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  day.isActive ? 'bg-[var(--accent)]' : 'bg-[var(--bg-tertiary)]'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    day.isActive ? 'left-[26px]' : 'left-0.5'
                  }`}
                />
              </button>

              {/* Day name */}
              <span className={`w-24 font-medium ${day.isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}>
                {DAY_NAMES[day.dayOfWeek]}
              </span>

              {day.isActive && (
                <div className="flex items-center gap-3 flex-1">
                  <input
                    type="time"
                    value={day.startTime}
                    onChange={(e) => updateDay(i, { startTime: e.target.value })}
                    className={inputClass}
                  />
                  <span className="text-[var(--text-tertiary)]">a</span>
                  <input
                    type="time"
                    value={day.endTime}
                    onChange={(e) => updateDay(i, { endTime: e.target.value })}
                    className={inputClass}
                  />
                  <select
                    value={day.slotDurationMin}
                    onChange={(e) => updateDay(i, { slotDurationMin: Number(e.target.value) })}
                    className={inputClass}
                  >
                    <option value={15}>15 min</option>
                    <option value={20}>20 min</option>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>60 min</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white font-medium rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-60 transition-colors"
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
          ) : (
            <><Save className="w-4 h-4" /> Guardar Horarios</>
          )}
        </button>
        {saved && <span className="text-sm text-[var(--success)]">Horarios guardados</span>}
      </div>
    </div>
  )
}
