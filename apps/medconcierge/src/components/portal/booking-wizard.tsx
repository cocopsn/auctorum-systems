'use client'

import { useState } from 'react'
import { CheckCircle2, MapPin, CalendarCheck, Check, Download, ArrowLeft } from 'lucide-react'
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

function generateIcsContent(opts: {
  date: string
  startTime: string
  endTime: string
  doctorName: string
  address: string
  reason?: string
}): string {
  const formatIcsDate = (date: string, time: string) => {
    const d = date.replace(/-/g, '')
    const t = time.replace(/:/g, '').slice(0, 6)
    return `${d}T${t}`
  }

  const dtStart = formatIcsDate(opts.date, opts.startTime)
  const dtEnd = formatIcsDate(opts.date, opts.endTime)
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Auctorum Systems//MedConcierge//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART;TZID=America/Monterrey:${dtStart}`,
    `DTEND;TZID=America/Monterrey:${dtEnd}`,
    `DTSTAMP:${now}`,
    `UID:${crypto.randomUUID()}@auctorum.com.mx`,
    `SUMMARY:Cita con ${opts.doctorName}`,
    `LOCATION:${opts.address}`,
    `DESCRIPTION:${opts.reason || 'Consulta medica'}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT60M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Recordatorio de cita',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

function downloadIcs(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

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
  const [portalToken, setPortalToken] = useState<string | null>(null)
  const [bookedReason, setBookedReason] = useState<string>('')

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

    const handleDownloadIcs = () => {
      const ics = generateIcsContent({
        date: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        doctorName: tenantName,
        address,
        reason: bookedReason,
      })
      downloadIcs(ics, `cita-${tenantName.replace(/\s+/g, '-').toLowerCase()}.ics`)
    }

    return (
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-[var(--success)]/10 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-[var(--success)]" />
        </div>
        <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Cita Agendada</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
          Su cita ha sido registrada exitosamente. Recibira confirmacion por WhatsApp y email.
        </p>
        <div className="bg-[var(--bg-tertiary)] rounded-lg p-5 text-left space-y-3 max-w-md mx-auto">
          <div className="flex items-center gap-3 text-sm">
            <CalendarCheck className="w-4 h-4 text-[var(--accent)] shrink-0" />
            <span className="font-medium text-[var(--text-primary)] capitalize">{displayDate} &mdash; {selectedSlot.startTime.slice(0, 5)}</span>
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

        <p className="text-xs text-[var(--text-tertiary)] mt-4">
          Le enviaremos un recordatorio por WhatsApp 24 horas antes de su cita.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          <button
            onClick={handleDownloadIcs}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-[var(--accent)] border border-[var(--accent)]/30 rounded-lg hover:bg-[var(--accent-muted)] transition-colors"
          >
            <Download className="w-4 h-4" />
            Agregar a mi calendario
          </button>
          {portalToken && (
            <a
              href={`/${slug}/portal/${portalToken}`}
              className="px-5 py-2.5 text-sm font-medium text-white bg-[var(--accent)] rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
            >
              Ver mi portal
            </a>
          )}
        </div>
        <div className="mt-4">
          <a
            href={`/${slug}`}
            className="text-sm text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors"
          >
            Volver al perfil
          </a>
        </div>
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
          onSuccess={(data) => {
            setPortalToken(data.portalToken)
            setBookedReason(data.reason || '')
            setStep('success')
          }}
        />
      )}
    </div>
  )
}
