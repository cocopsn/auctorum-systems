'use client'

import { useState } from 'react'
import { CheckCircle2, MapPin, CalendarCheck, Check } from 'lucide-react'
import { AvailabilityCalendar } from './availability-calendar'
import { BookingForm } from './booking-form'
import { formatCurrency } from '@/lib/utils'

type Slot = {
  startTime: string
  endTime: string
  available: boolean
}

type Step = 'calendar' | 'form' | 'success'

const STEPS = [
  { key: 'calendar', label: 'Horario' },
  { key: 'form', label: 'Datos' },
] as const

export function BookingWizard({
  tenantId,
  tenantName,
  slug,
  insuranceProviders,
  address,
  fee,
  showFee,
}: {
  tenantId: string
  tenantName: string
  slug: string
  insuranceProviders: string[]
  address: string
  fee: number
  showFee: boolean
}) {
  const [step, setStep] = useState<Step>('calendar')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)

  const handleSlotSelect = (date: string, slot: Slot) => {
    setSelectedDate(date)
    setSelectedSlot(slot)
    setStep('form')
  }

  const currentStepIndex = STEPS.findIndex((s) => s.key === step)

  if (step === 'success' && selectedDate && selectedSlot) {
    const displayDate = new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    return (
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-[var(--success)]/10 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-[var(--success)]" />
        </div>
        <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Cita Agendada</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
          Su cita ha sido registrada exitosamente. Recibirá confirmación por WhatsApp y email.
        </p>
        <div className="bg-[var(--bg-tertiary)] rounded-lg p-5 text-left space-y-3 max-w-md mx-auto">
          <div className="flex items-center gap-3 text-sm">
            <CalendarCheck className="w-4 h-4 text-[var(--accent)] shrink-0" />
            <span className="font-medium text-[var(--text-primary)]">{displayDate} — {selectedSlot.startTime.slice(0, 5)}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <MapPin className="w-4 h-4 text-[var(--accent)] shrink-0" />
            <span className="text-[var(--text-secondary)]">{address}</span>
          </div>
          {showFee && (
            <p className="text-sm text-[var(--text-tertiary)] pt-2 border-t border-[var(--border)]">
              Consulta: <span className="font-semibold text-[var(--text-primary)]">{formatCurrency(fee)}</span>
            </p>
          )}
        </div>
        <a
          href="/"
          className="inline-block mt-6 px-5 py-2 text-sm font-medium text-[var(--accent)] border border-[var(--border)] rounded-lg hover:border-[var(--border-hover)] transition-colors"
        >
          Volver al perfil
        </a>
      </div>
    )
  }

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6 sm:p-8">
      {/* Step indicator */}
      <div className="flex items-center justify-center mb-8">
        {STEPS.map((s, i) => {
          const isActive = s.key === step
          const isCompleted = currentStepIndex > i

          return (
            <div key={s.key} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all
                    ${isCompleted
                      ? 'bg-[var(--accent)] text-white'
                      : isActive
                        ? 'bg-[var(--accent)] text-white ring-4 ring-[var(--accent-muted)]'
                        : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]'
                    }`}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`mt-1.5 text-[11px] font-medium ${isActive || isCompleted ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)]'}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-16 sm:w-24 h-px mx-3 mb-5 ${isCompleted ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`} />
              )}
            </div>
          )
        })}
      </div>

      {step === 'calendar' && (
        <AvailabilityCalendar tenantId={tenantId} onSlotSelect={handleSlotSelect} />
      )}

      {step === 'form' && selectedDate && selectedSlot && (
        <BookingForm
          tenantId={tenantId}
          date={selectedDate}
          slot={selectedSlot}
          insuranceProviders={insuranceProviders}
          onBack={() => setStep('calendar')}
          onSuccess={() => setStep('success')}
        />
      )}
    </div>
  )
}
