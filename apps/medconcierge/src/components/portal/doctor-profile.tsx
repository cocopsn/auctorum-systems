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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="relative h-44 bg-gradient-to-br from-tenant-primary via-tenant-secondary to-tenant-accent">
          {/* Subtle overlay pattern */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          />
        </div>
        <div className="px-6 pb-8 -mt-14">
          <div className="flex flex-col sm:flex-row sm:items-end gap-5">
            {/* Avatar with double ring */}
            <div className="relative">
              <div className="w-28 h-28 rounded-full bg-white ring-4 ring-white shadow-xl flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-tenant-primary to-tenant-secondary flex items-center justify-center text-4xl font-bold text-white ring-2 ring-tenant-primary/30">
                  {doctor.specialty.charAt(0)}
                </div>
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                {config.medical!.specialty}
              </h2>
              {/* Specialty badge */}
              {doctor.subSpecialty && (
                <span className="inline-block mt-1.5 px-3 py-1 bg-tenant-primary/10 text-tenant-primary text-sm font-medium rounded-full">
                  {doctor.subSpecialty}
                </span>
              )}
              <div className="flex flex-wrap gap-3 mt-2.5 text-sm text-gray-500">
                {doctor.cedulaProfesional && (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-tenant-primary/40" />
                    Céd. Prof. {doctor.cedulaProfesional}
                  </span>
                )}
                {doctor.cedulaEspecialidad && (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-tenant-primary/40" />
                    Céd. Esp. {doctor.cedulaEspecialidad}
                  </span>
                )}
              </div>
            </div>
            <Link
              href={`/${slug}/agendar`}
              className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-tenant-primary text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              <CalendarPlus className="w-5 h-5" />
              Agendar Cita
            </Link>
          </div>
        </div>
      </div>

      {/* Bio */}
      {doctor.bio && (
        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Acerca de</h3>
          <p className="text-gray-600 leading-relaxed whitespace-pre-line">{doctor.bio}</p>
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
          <div className="space-y-1.5">
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
                  className="px-2.5 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full"
                >
                  {ins}
                </span>
              ))}
            </div>
          </InfoCard>
        )}

        {/* Fee - highlighted */}
        {config.schedule_settings!.show_fee_on_portal && (
          <div className="bg-white rounded-2xl shadow-sm border border-tenant-primary/20 p-5 hover:shadow-md transition-shadow duration-200 bg-gradient-to-br from-white to-tenant-primary/[0.03]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-tenant-primary/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-tenant-primary" />
              </div>
              <h3 className="font-semibold text-gray-900">Consulta</h3>
            </div>
            <p className="text-2xl font-bold text-tenant-primary">
              {formatCurrency(config.medical!.consultation_fee)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Duración: {config.medical!.consultation_duration_min} minutos
            </p>
          </div>
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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-tenant-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-tenant-primary" />
        </div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  )
}
