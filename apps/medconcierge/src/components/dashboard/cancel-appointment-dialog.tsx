'use client'

import { useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { toast } from '@/components/ui/Toast'

type Props = {
  appointmentId: string
  patientName: string
  date: string
  startTime: string
  open: boolean
  onClose: () => void
  onCancelled: () => void
}

export function CancelAppointmentDialog({
  appointmentId,
  patientName,
  date,
  startTime,
  open,
  onClose,
  onCancelled,
}: Props) {
  const [reason, setReason] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!open) {
      setReason('')
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
    setPending(true)
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error ?? 'Error')
      toast('success', 'Cita cancelada y paciente notificado')
      onCancelled()
      onClose()
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'No se pudo cancelar')
    } finally {
      setPending(false)
    }
  }

  const displayDate = new Date(date + 'T12:00:00').toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onClose()
      }}
    >
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Cancelar cita</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          ¿Cancelar la cita de{' '}
          <strong className="text-[var(--text-primary)]">{patientName}</strong> del {displayDate} a
          las {startTime.slice(0, 5)}? El paciente recibirá notificación por WhatsApp.
        </p>
        <label className="block text-xs text-[var(--text-tertiary)] mb-1.5 font-mono uppercase">
          Motivo (opcional)
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={500}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          placeholder="Ej: el doctor tiene una emergencia"
        />
        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm hover:bg-[var(--bg-elevated)] disabled:opacity-50"
          >
            No cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--error)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Sí, cancelar cita
          </button>
        </div>
      </div>
    </div>
  )
}
