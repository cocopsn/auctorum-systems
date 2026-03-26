import { MapPin, Clock, Shield, CreditCard, GraduationCap, Building2, Languages, CalendarPlus } from 'lucide-react'
import Link from 'next/link'
import type { Doctor } from '@quote-engine/db'
import type { TenantConfig } from '@quote-engine/db'
import type { Schedule } from '@quote-engine/db'
import { formatCurrency } from '@/lib/utils'

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export function DoctorProfile({
  doctor,
  config,
  schedules,
  slug,
}: {
  doctor: Doctor
  config: TenantConfig
  schedules: Schedule[]
  slug: string
}) {
  const activeSchedules = schedules.filter((s) => s.isActive)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-tenant-primary to-tenant-secondary" />
        <div className="px-6 pb-6 -mt-12">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="w-24 h-24 rounded-full bg-white border-4 border-white shadow-md flex items-center justify-center text-3xl font-bold text-tenant-primary">
              {doctor.specialty.charAt(0)}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">{config.medical!.specialty}</h2>
              {doctor.subSpecialty && (
                <p className="text-gray-500">{doctor.subSpecialty}</p>
              )}
              <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
                {doctor.cedulaProfesional && (
                  <span>Céd. Prof. {doctor.cedulaProfesional}</span>
                )}
                {doctor.cedulaEspecialidad && (
                  <span>Céd. Esp. {doctor.cedulaEspecialidad}</span>
                )}
              </div>
            </div>
            <Link
              href={`/${slug}/agendar`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-tenant-primary text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
            >
              <CalendarPlus className="w-5 h-5" />
              Agendar Cita
            </Link>
          </div>
        </div>
      </div>

      {/* Bio */}
      {doctor.bio && (
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Acerca de</h3>
          <p className="text-gray-600 whitespace-pre-line">{doctor.bio}</p>
        </div>
      )}

      {/* Info Cards */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Location */}
        <InfoCard icon={MapPin} title="Ubicación">
          <p className="text-gray-600">{config.contact.address}</p>
        </InfoCard>

        {/* Schedule */}
        <InfoCard icon={Clock} title="Horarios">
          <div className="space-y-1">
            {activeSchedules.map((s) => (
              <div key={s.id} className="flex justify-between text-sm">
                <span className="text-gray-600">{DAY_NAMES[s.dayOfWeek]}</span>
                <span className="text-gray-900 font-medium">
                  {s.startTime.slice(0, 5)} - {s.endTime.slice(0, 5)}
                </span>
              </div>
            ))}
          </div>
        </InfoCard>

        {/* Insurance */}
        {doctor.acceptsInsurance && doctor.insuranceProviders && doctor.insuranceProviders.length > 0 && (
          <InfoCard icon={Shield} title="Seguros Aceptados">
            <div className="flex flex-wrap gap-2">
              {doctor.insuranceProviders.map((ins) => (
                <span
                  key={ins}
                  className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full"
                >
                  {ins}
                </span>
              ))}
            </div>
          </InfoCard>
        )}

        {/* Fee */}
        {config.schedule_settings!.show_fee_on_portal && (
          <InfoCard icon={CreditCard} title="Consulta">
            <p className="text-2xl font-bold text-tenant-primary">
              {formatCurrency(config.medical!.consultation_fee)}
            </p>
            <p className="text-sm text-gray-500">
              Duración: {config.medical!.consultation_duration_min} minutos
            </p>
          </InfoCard>
        )}

        {/* Education */}
        {doctor.education && (
          <InfoCard icon={GraduationCap} title="Formación">
            <p className="text-gray-600 text-sm whitespace-pre-line">{doctor.education}</p>
          </InfoCard>
        )}

        {/* Hospital Affiliations */}
        {doctor.hospitalAffiliations && (
          <InfoCard icon={Building2} title="Hospitales">
            <p className="text-gray-600 text-sm whitespace-pre-line">{doctor.hospitalAffiliations}</p>
          </InfoCard>
        )}

        {/* Languages */}
        {doctor.languages && (
          <InfoCard icon={Languages} title="Idiomas">
            <p className="text-gray-600">{doctor.languages}</p>
          </InfoCard>
        )}
      </div>
    </div>
  )
}

function InfoCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-5 h-5 text-tenant-primary" />
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  )
}
