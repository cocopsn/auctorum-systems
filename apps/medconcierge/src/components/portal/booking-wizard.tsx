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
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 sm:p-10 text-center">
        {/* Animated success circle */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full bg-green-100 animate-ping opacity-20" />
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Cita Agendada</h3>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">
          Su cita ha sido registrada exitosamente. Recibirá una confirmación por WhatsApp y email.
        </p>
        {/* Summary card */}
        <div className="bg-gray-50 rounded-xl p-6 text-left space-y-3 shadow-sm border border-gray-100 max-w-md mx-auto">
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 rounded-lg bg-tenant-primary/10 flex items-center justify-center shrink-0">
              <CalendarCheck className="w-4 h-4 text-tenant-primary" />
            </div>
            <span className="font-semibold text-gray-900">{displayDate} — {selectedSlot.startTime.slice(0, 5)}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 rounded-lg bg-tenant-primary/10 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-tenant-primary" />
            </div>
            <span className="text-gray-600">{address}</span>
          </div>
          {showFee && (
            <p className="text-sm text-gray-500 pt-2 border-t border-gray-200">
              Costo de consulta: <span className="font-semibold text-gray-900">{formatCurrency(fee)}</span>
            </p>
          )}
        </div>
        <a
          href={`/${slug}`}
          className="inline-block mt-8 px-6 py-2.5 text-sm font-medium text-tenant-primary border border-tenant-primary/30 rounded-xl hover:bg-tenant-primary/5 transition-colors"
        >
          Volver al perfil
        </a>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
      {/* Step indicator with connected line */}
      <div className="flex items-center justify-center mb-8">
        {STEPS.map((s, i) => {
          const isActive = s.key === step
          const isCompleted = currentStepIndex > i

          return (
            <div key={s.key} className="flex items-center">
              <div className="flex flex-col items-center">
                {/* Circle */}
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300
                    ${isCompleted
                      ? 'bg-tenant-primary text-white shadow-md'
                      : isActive
                        ? 'bg-tenant-primary text-white shadow-lg ring-4 ring-tenant-primary/20'
                        : 'bg-gray-100 text-gray-400'
                    }
                  `}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : i + 1}
                </div>
                {/* Label */}
                <span
                  className={`
                    mt-2 text-xs font-medium transition-colors
                    ${isActive || isCompleted ? 'text-tenant-primary' : 'text-gray-400'}
                  `}
                >
                  {s.label}
                </span>
              </div>
              {/* Connecting line */}
              {i < STEPS.length - 1 && (
                <div
                  className={`
                    w-16 sm:w-24 h-0.5 mx-3 mb-6 rounded-full transition-colors duration-300
                    ${isCompleted ? 'bg-tenant-primary' : 'bg-gray-200'}
                  `}
                />
              )}
            </div>
          )
        })}
      </div>

      {step === 'calendar' && (
        <AvailabilityCalendar
          tenantId={tenantId}
          onSlotSelect={handleSlotSelect}
        />
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
