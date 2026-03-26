'use client'

import { useState } from 'react'
import { CheckCircle2, MapPin, CalendarCheck } from 'lucide-react'
import { AvailabilityCalendar } from './availability-calendar'
import { BookingForm } from './booking-form'
import { formatCurrency } from '@/lib/utils'

type Slot = {
  startTime: string
  endTime: string
  available: boolean
}

type Step = 'calendar' | 'form' | 'success'

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

  if (step === 'success' && selectedDate && selectedSlot) {
    const displayDate = new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Cita Agendada</h3>
        <p className="text-gray-500 mb-6">
          Su cita ha sido registrada exitosamente. Recibirá una confirmación por WhatsApp y email.
        </p>
        <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <CalendarCheck className="w-4 h-4 text-tenant-primary" />
            <span className="font-medium">{displayDate} — {selectedSlot.startTime.slice(0, 5)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-tenant-primary" />
            <span>{address}</span>
          </div>
          {showFee && (
            <p className="text-sm text-gray-500">
              Costo de consulta: <span className="font-medium text-gray-900">{formatCurrency(fee)}</span>
            </p>
          )}
        </div>
        <a
          href={`/${slug}`}
          className="inline-block mt-6 text-sm text-tenant-primary hover:underline"
        >
          Volver al perfil
        </a>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <span className={`px-3 py-1 rounded-full ${step === 'calendar' ? 'bg-tenant-primary text-white' : 'bg-gray-100 text-gray-500'}`}>
          1. Horario
        </span>
        <span className="text-gray-300">→</span>
        <span className={`px-3 py-1 rounded-full ${step === 'form' ? 'bg-tenant-primary text-white' : 'bg-gray-100 text-gray-500'}`}>
          2. Datos
        </span>
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
