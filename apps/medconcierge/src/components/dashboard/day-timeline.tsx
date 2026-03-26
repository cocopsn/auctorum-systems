import { Clock, User, FileText, CalendarX } from 'lucide-react'
import { StatusBadge } from './status-badge'
import type { Appointment, Patient } from '@quote-engine/db'

type AppointmentWithPatient = Appointment & { patient: Patient }

export function DayTimeline({
  appointments,
  currentTime,
}: {
  appointments: AppointmentWithPatient[]
  currentTime: string
}) {
  if (appointments.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
          <CalendarX className="w-8 h-8 text-gray-300" />
        </div>
        <p className="text-lg font-semibold text-gray-400 mb-1">Sin citas hoy</p>
        <p className="text-sm text-gray-400">No hay citas agendadas para hoy.</p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Vertical timeline line */}
      <div className="absolute left-[30px] top-4 bottom-4 w-0.5 bg-gray-200 rounded-full" />

      <div className="space-y-4">
        {appointments.map((appt) => {
          const isNext = appt.startTime > currentTime && appt.status !== 'completed' && appt.status !== 'cancelled'
          const isPast = appt.endTime <= currentTime

          return (
            <div key={appt.id} className="relative flex items-start gap-4">
              {/* Timeline dot */}
              <div className="relative z-10 flex flex-col items-center shrink-0">
                <div
                  className={`
                    w-4 h-4 rounded-full border-2 mt-5
                    ${isNext
                      ? 'bg-tenant-primary border-tenant-primary shadow-md shadow-tenant-primary/30'
                      : isPast && appt.status === 'completed'
                        ? 'bg-green-400 border-green-400'
                        : isPast && appt.status === 'cancelled'
                          ? 'bg-red-400 border-red-400'
                          : 'bg-white border-gray-300'
                    }
                  `}
                />
              </div>

              {/* Appointment card */}
              <div
                className={`
                  flex-1 bg-white rounded-xl border p-4 transition-all duration-200 hover:shadow-md
                  ${isNext
                    ? 'border-tenant-primary/30 shadow-md ring-2 ring-tenant-primary/20'
                    : 'border-gray-200 shadow-sm'
                  }
                  ${isPast && appt.status !== 'completed' ? 'opacity-50' : ''}
                `}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Time */}
                    <div className="text-center min-w-[60px] shrink-0">
                      <p className="text-lg font-bold text-gray-900 font-mono tracking-tight">
                        {appt.startTime.slice(0, 5)}
                      </p>
                      <p className="text-xs text-gray-400 font-mono">
                        {appt.endTime.slice(0, 5)}
                      </p>
                    </div>
                    {/* Details */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="font-semibold text-gray-900 truncate">{appt.patient.name}</span>
                      </div>
                      {appt.reason && (
                        <div className="flex items-center gap-2 mt-1.5">
                          <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="text-sm text-gray-500 truncate">{appt.reason}</span>
                        </div>
                      )}
                      {isNext && (
                        <span className="inline-flex items-center gap-1.5 mt-2.5 px-2.5 py-0.5 text-xs font-semibold text-tenant-primary bg-tenant-primary/10 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-tenant-primary animate-pulse" />
                          Próxima cita
                        </span>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={appt.status ?? 'scheduled'} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
