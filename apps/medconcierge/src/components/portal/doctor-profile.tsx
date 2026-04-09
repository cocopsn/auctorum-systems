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
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Hero Card */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="relative h-32 bg-gradient-to-br from-[var(--tenant-primary)] to-[var(--accent)] opacity-80">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          />
        </div>
        <div className="px-6 pb-6 -mt-12">
          <div className="flex flex-col sm:flex-row sm:items-end gap-5">
            <div className="w-24 h-24 rounded-full bg-[var(--bg-secondary)] ring-4 ring-[var(--bg-secondary)] flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--tenant-primary)] to-[var(--accent)] flex items-center justify-center text-3xl font-bold text-white">
                {doctor.specialty.charAt(0)}
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)]">
                {config.medical!.specialty}
              </h2>
              {doctor.subSpecialty && (
                <span className="inline-block mt-1.5 px-2.5 py-0.5 bg-[var(--accent-muted)] text-[var(--accent)] text-xs font-medium rounded-full">
                  {doctor.subSpecialty}
                </span>
              )}
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-[var(--text-tertiary)]">
                {doctor.cedulaProfesional && (
                  <span>Céd. Prof. {doctor.cedulaProfesional}</span>
                )}
                {doctor.cedulaEspecialidad && (
                  <span>Céd. Esp. {doctor.cedulaEspecialidad}</span>
                )}
              </div>
            </div>
            <Link
              href="/agendar"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[var(--accent)] text-white text-sm font-medium rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
            >
              <CalendarPlus className="w-4 h-4" />
              Agendar Cita
            </Link>
          </div>
        </div>
      </div>

      {/* Bio */}
      {doctor.bio && (
        <div className="mt-5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Acerca de</h3>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">{doctor.bio}</p>
        </div>
      )}

      {/* Info Grid */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InfoCard icon={MapPin} title="Ubicación">
          <p className="text-sm text-[var(--text-secondary)]">{config.contact.address}</p>
        </InfoCard>

        <InfoCard icon={Clock} title="Horarios">
          <div className="space-y-1">
            {activeSchedules.map((s) => (
              <div key={s.id} className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">{DAY_NAMES[s.dayOfWeek]}</span>
                <span className="text-[var(--text-primary)] font-mono text-xs">
                  {s.startTime.slice(0, 5)} - {s.endTime.slice(0, 5)}
                </span>
              </div>
            ))}
          </div>
        </InfoCard>

        {doctor.acceptsInsurance && doctor.insuranceProviders && doctor.insuranceProviders.length > 0 && (
          <InfoCard icon={Shield} title="Seguros Aceptados">
            <div className="flex flex-wrap gap-2">
              {doctor.insuranceProviders.map((ins) => (
                <span key={ins} className="px-2 py-0.5 bg-[var(--success)]/10 text-[var(--success)] text-xs font-medium rounded">
                  {ins}
                </span>
              ))}
            </div>
          </InfoCard>
        )}

        {config.schedule_settings!.show_fee_on_portal && (
          <div className="bg-[var(--bg-secondary)] border border-[var(--accent)]/20 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent-muted)] flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-[var(--accent)]" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Consulta</h3>
            </div>
            <p className="text-2xl font-bold text-[var(--accent)]">
              {formatCurrency(config.medical!.consultation_fee)}
            </p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              Duración: {config.medical!.consultation_duration_min} minutos
            </p>
          </div>
        )}

        {doctor.education && (
          <InfoCard icon={GraduationCap} title="Formación">
            <p className="text-sm text-[var(--text-secondary)] whitespace-pre-line">{doctor.education}</p>
          </InfoCard>
        )}

        {doctor.hospitalAffiliations && (
          <InfoCard icon={Building2} title="Hospitales">
            <p className="text-sm text-[var(--text-secondary)] whitespace-pre-line">{doctor.hospitalAffiliations}</p>
          </InfoCard>
        )}

        {doctor.languages && (
          <InfoCard icon={Languages} title="Idiomas">
            <p className="text-sm text-[var(--text-secondary)]">{doctor.languages}</p>
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
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--border-hover)] transition-colors">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-[var(--accent-muted)] flex items-center justify-center">
          <Icon className="w-4 h-4 text-[var(--accent)]" />
        </div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
      </div>
      {children}
    </div>
  )
}
