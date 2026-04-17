'use client'

import { useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { AvailabilityCalendar } from '@/components/portal/availability-calendar'
import { toast } from '@/components/ui/Toast'

type SelectedSlot = {
  date: string
  startTime: string
  endTime: string
}

type Props = {
  appointmentId: string
  tenantId: string
  patientName: string
  currentDate: string
  currentStartTime: string
  open: boolean
  onClose: () => void
  onRescheduled: () => void
}

export function RescheduleAppointmentDialog({
  appointmentId,
  tenantId,
  patientName,
  currentDate,
  currentStartTime,
  open,
  onClose,
  onRescheduled,
}: Props) {
  const [selected, setSelected] = useState<SelectedSlot | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!open) {
      setSelected(null)
      return
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pending) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, pending, onClose])

  if (!open) return null

  async function submit() {
    if (!selected) return
    setPending(true)
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selected.date,
          startTime: selected.startTime,
          endTime: selected.endTime,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error ?? 'Error')
      toast('success', 'Cita reagendada y paciente notificado')
      onRescheduled()
      onClose()
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'No se pudo reagendar')
    } finally {
      setPending(false)
    }
  }

  const currentDisplay = new Date(currentDate + 'T12:00:00').toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onClose()
      }}
    >
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl max-w-3xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Reagendar cita</h2>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
              {patientName} — actualmente {currentDisplay} {currentStartTime.slice(0, 5)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <AvailabilityCalendar
          tenantId={tenantId}
          onSlotSelect={(date, slot) =>
            setSelected({ date, startTime: slot.startTime, endTime: slot.endTime })
          }
        />

        {selected && (
          <div className="mt-4 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-2.5 text-sm text-[var(--text-primary)]">
            Nuevo horario:{' '}
            <strong>
              {new Date(selected.date + 'T12:00:00').toLocaleDateString('es-MX', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}{' '}
              {selected.startTime.slice(0, 5)}
            </strong>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm hover:bg-[var(--bg-elevated)] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending || !selected}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirmar reagendamiento
          </button>
        </div>
      </div>
    </div>
  )
}
