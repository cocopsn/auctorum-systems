'use client'

import { useState } from 'react'
import { CalendarCheck, Loader2 } from 'lucide-react'
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
  onSuccess: (data: { appointmentId: string }) => void
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
      onSuccess({ appointmentId: data.appointment.id })
    } catch {
      setServerError('Error de conexión. Intente de nuevo.')
      setSubmitting(false)
    }
  }

  const displayDate = new Date(date + 'T12:00:00').toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div>
      {/* Selected slot summary */}
      <div className="bg-tenant-primary/5 border border-tenant-primary/20 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 text-tenant-primary font-medium">
          <CalendarCheck className="w-5 h-5" />
          <span>{displayDate} — {slot.startTime.slice(0, 5)}</span>
        </div>
        <button
          onClick={onBack}
          className="mt-1 text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Cambiar horario
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre completo *
          </label>
          <input
            type="text"
            value={form.patientName}
            onChange={(e) => handleChange('patientName', e.target.value)}
            placeholder="María González"
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-tenant-primary/30 ${errors.patientName ? 'border-red-400' : 'border-gray-300'}`}
          />
          {errors.patientName && <p className="mt-1 text-xs text-red-500">{errors.patientName}</p>}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Teléfono (WhatsApp) *
          </label>
          <input
            type="tel"
            value={form.patientPhone}
            onChange={(e) => handleChange('patientPhone', e.target.value)}
            placeholder="844 100 1001"
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-tenant-primary/30 ${errors.patientPhone ? 'border-red-400' : 'border-gray-300'}`}
          />
          {errors.patientPhone && <p className="mt-1 text-xs text-red-500">{errors.patientPhone}</p>}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={form.patientEmail}
            onChange={(e) => handleChange('patientEmail', e.target.value)}
            placeholder="maria@email.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-tenant-primary/30"
          />
          {errors.patientEmail && <p className="mt-1 text-xs text-red-500">{errors.patientEmail}</p>}
        </div>

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Motivo de consulta
          </label>
          <textarea
            value={form.reason}
            onChange={(e) => handleChange('reason', e.target.value)}
            placeholder="Describa brevemente el motivo de su consulta"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-tenant-primary/30 resize-none"
          />
        </div>

        {/* Insurance */}
        {insuranceProviders.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Seguro médico
            </label>
            <select
              value={form.insurance}
              onChange={(e) => handleChange('insurance', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-tenant-primary/30 bg-white"
            >
              <option value="">Sin seguro / Particular</option>
              {insuranceProviders.map((ins) => (
                <option key={ins} value={ins}>{ins}</option>
              ))}
            </select>
          </div>
        )}

        {/* Server error */}
        {serverError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {serverError}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-tenant-primary text-white font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60"
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
