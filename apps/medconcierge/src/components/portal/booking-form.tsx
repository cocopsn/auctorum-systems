'use client'

import { useState } from 'react'
import { CalendarCheck, Loader2, AlertCircle, Clock } from 'lucide-react'
import { bookingFormSchema, type BookingFormInput } from '@/lib/validators/appointment'

type Slot = {
  startTime: string
  endTime: string
  available: boolean
}

export function BookingForm({
  tenantId,
  date,
  slot,
  insuranceProviders,
  onBack,
  onSuccess,
}: {
  tenantId: string
  date: string
  slot: Slot
  insuranceProviders: string[]
  onBack: () => void
  onSuccess: (data: { appointmentId: string; portalToken: string; reason?: string }) => void
}) {
  const [form, setForm] = useState<BookingFormInput>({
    patientName: '',
    patientPhone: '',
    patientEmail: '',
    reason: '',
    insurance: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof BookingFormInput, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const handleChange = (field: keyof BookingFormInput, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
    setServerError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError(null)

    const result = bookingFormSchema.safeParse(form)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string
        fieldErrors[field] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          ...result.data,
        }),
      })

      if (res.status === 409) {
        setServerError('Este horario acaba de ser tomado. Por favor seleccione otro.')
        setSubmitting(false)
        return
      }

      if (!res.ok) {
        const data = await res.json()
        setServerError(data.error ?? 'Error al agendar. Intente de nuevo.')
        setSubmitting(false)
        return
      }

      const data = await res.json()
      onSuccess({
        appointmentId: data.appointment.id,
        portalToken: data.patient.portalToken,
        reason: result.data.reason,
      })
    } catch {
      setServerError('Error de conexion. Intente de nuevo.')
      setSubmitting(false)
    }
  }

  const displayDate = new Date(date + 'T12:00:00').toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const inputClass = (hasError: boolean) =>
    `w-full px-4 py-2.5 border rounded-lg text-sm bg-[var(--bg-tertiary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-colors focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] ${hasError ? 'border-[var(--error)]' : 'border-[var(--border)]'}`

  return (
    <div>
      {/* Selected slot */}
      <div className="bg-[var(--accent-muted)] border border-[var(--accent)]/20 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3">
          <CalendarCheck className="w-5 h-5 text-[var(--accent)] shrink-0" />
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)] capitalize">{displayDate}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Clock className="w-3 h-3 text-[var(--accent)]" />
              <span className="text-base font-bold text-[var(--accent)]">{slot.startTime.slice(0, 5)}</span>
            </div>
          </div>
        </div>
        <button
          onClick={onBack}
          className="mt-2 text-xs text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors"
        >
          Cambiar horario
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Nombre completo *
          </label>
          <input
            type="text"
            value={form.patientName}
            onChange={(e) => handleChange('patientName', e.target.value)}
            placeholder="Maria Gonzalez"
            className={inputClass(!!errors.patientName)}
          />
          {errors.patientName && (
            <div className="flex items-center gap-1.5 mt-1">
              <AlertCircle className="w-3 h-3 text-[var(--error)] shrink-0" />
              <p className="text-xs text-[var(--error)]">{errors.patientName}</p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Telefono (WhatsApp) *
          </label>
          <input
            type="tel"
            value={form.patientPhone}
            onChange={(e) => handleChange('patientPhone', e.target.value)}
            placeholder="844 100 1001"
            className={inputClass(!!errors.patientPhone)}
          />
          {errors.patientPhone && (
            <div className="flex items-center gap-1.5 mt-1">
              <AlertCircle className="w-3 h-3 text-[var(--error)] shrink-0" />
              <p className="text-xs text-[var(--error)]">{errors.patientPhone}</p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={form.patientEmail}
            onChange={(e) => handleChange('patientEmail', e.target.value)}
            placeholder="maria@email.com"
            className={inputClass(!!errors.patientEmail)}
          />
          {errors.patientEmail && (
            <div className="flex items-center gap-1.5 mt-1">
              <AlertCircle className="w-3 h-3 text-[var(--error)] shrink-0" />
              <p className="text-xs text-[var(--error)]">{errors.patientEmail}</p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Motivo de consulta
          </label>
          <textarea
            value={form.reason}
            onChange={(e) => handleChange('reason', e.target.value)}
            placeholder="Describa brevemente el motivo de su consulta"
            rows={3}
            className={`${inputClass(false)} resize-none`}
          />
        </div>

        {insuranceProviders.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Seguro medico
            </label>
            <select
              value={form.insurance}
              onChange={(e) => handleChange('insurance', e.target.value)}
              className={inputClass(false)}
            >
              <option value="">Sin seguro / Particular</option>
              {insuranceProviders.map((ins) => (
                <option key={ins} value={ins}>{ins}</option>
              ))}
            </select>
          </div>
        )}

        {serverError && (
          <div className="flex items-start gap-2 p-3 bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-lg text-sm text-[var(--error)]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--accent)] text-white text-sm font-medium rounded-lg hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Agendando...
            </>
          ) : (
            'Agendar Cita'
          )}
        </button>
      </form>
    </div>
  )
}
