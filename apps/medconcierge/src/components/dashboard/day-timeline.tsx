import { Clock, User, FileText } from 'lucide-react'
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
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No hay citas agendadas para hoy.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {appointments.map((appt) => {
        const isNext = appt.startTime > currentTime && appt.status !== 'completed' && appt.status !== 'cancelled'
        const isPast = appt.endTime <= currentTime

        return (
          <div
            key={appt.id}
            className={`
              bg-white rounded-xl border p-4 transition-all
              ${isNext ? 'border-tenant-primary shadow-md ring-1 ring-tenant-primary/20' : 'border-gray-200'}
              ${isPast && appt.status !== 'completed' ? 'opacity-60' : ''}
            `}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="text-center min-w-[60px]">
                  <p className="text-lg font-bold text-gray-900">
                    {appt.startTime.slice(0, 5)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {appt.endTime.slice(0, 5)}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-900">{appt.patient.name}</span>
                  </div>
                  {appt.reason && (
                    <div className="flex items-center gap-2 mt-1">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-500">{appt.reason}</span>
                    </div>
                  )}
                  {isNext && (
                    <span className="inline-block mt-2 text-xs font-medium text-tenant-primary">
                      Próxima cita
                    </span>
                  )}
                </div>
              </div>
              <StatusBadge status={appt.status ?? 'scheduled'} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
