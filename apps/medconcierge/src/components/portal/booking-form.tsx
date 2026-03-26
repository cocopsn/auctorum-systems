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
      <div className="bg-tenant-primary/5 border border-tenant-primary/20 rounded-xl p-5 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-tenant-primary/10 flex items-center justify-center shrink-0">
            <CalendarCheck className="w-5 h-5 text-tenant-primary" />
          </div>
          <div>
            <p className="text-tenant-primary font-semibold capitalize">{displayDate}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-tenant-primary/70" />
              <span className="text-lg font-bold text-tenant-primary">{slot.startTime.slice(0, 5)}</span>
            </div>
          </div>
        </div>
        <button
          onClick={onBack}
          className="mt-3 text-sm text-gray-500 hover:text-tenant-primary font-medium underline underline-offset-2 transition-colors"
        >
          Cambiar horario
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Nombre completo *
          </label>
          <input
            type="text"
            value={form.patientName}
            onChange={(e) => handleChange('patientName', e.target.value)}
            placeholder="María González"
            className={`w-full px-4 py-2.5 border rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-tenant-primary/20 focus:border-tenant-primary ${errors.patientName ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
          />
          {errors.patientName && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <p className="text-xs text-red-500">{errors.patientName}</p>
            </div>
          )}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Teléfono (WhatsApp) *
          </label>
          <input
            type="tel"
            value={form.patientPhone}
            onChange={(e) => handleChange('patientPhone', e.target.value)}
            placeholder="844 100 1001"
            className={`w-full px-4 py-2.5 border rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-tenant-primary/20 focus:border-tenant-primary ${errors.patientPhone ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
          />
          {errors.patientPhone && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <p className="text-xs text-red-500">{errors.patientPhone}</p>
            </div>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={form.patientEmail}
            onChange={(e) => handleChange('patientEmail', e.target.value)}
            placeholder="maria@email.com"
            className={`w-full px-4 py-2.5 border rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-tenant-primary/20 focus:border-tenant-primary ${errors.patientEmail ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
          />
          {errors.patientEmail && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <p className="text-xs text-red-500">{errors.patientEmail}</p>
            </div>
          )}
        </div>

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Motivo de consulta
          </label>
          <textarea
            value={form.reason}
            onChange={(e) => handleChange('reason', e.target.value)}
            placeholder="Describa brevemente el motivo de su consulta"
            rows={3}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-tenant-primary/20 focus:border-tenant-primary resize-none"
          />
        </div>

        {/* Insurance */}
        {insuranceProviders.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Seguro médico
            </label>
            <select
              value={form.insurance}
              onChange={(e) => handleChange('insurance', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-tenant-primary/20 focus:border-tenant-primary bg-white"
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
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-tenant-primary text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 disabled:opacity-60 disabled:hover:shadow-lg disabled:hover:scale-100"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
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
