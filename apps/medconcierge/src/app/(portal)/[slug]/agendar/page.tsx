import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTenant, getTenantConfig, getDoctor } from '@/lib/tenant'
import { BookingWizard } from '@/components/portal/booking-wizard'

export default async function AgendarPage({
  params,
}: {
  params: { slug: string }
}) {
  const tenant = await getTenant(params.slug)
  if (!tenant) notFound()

  const config = getTenantConfig(tenant)
  const doctor = await getDoctor(tenant.id)
  if (!doctor) notFound()

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link
        href={`/${params.slug}`}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors mb-6"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Volver al perfil
      </Link>

      <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Agendar Cita</h2>
      <p className="text-[var(--text-secondary)] text-sm mb-6">
        Seleccione un dia y horario disponible para su consulta con {tenant.name}.
      </p>

      <BookingWizard
        tenantId={tenant.id}
        tenantName={tenant.name}
        slug={params.slug}
        insuranceProviders={config.medical?.insurance_providers ?? []}
        address={config.contact.address}
        fee={config.medical?.consultation_fee ?? 0}
        showFee={config.schedule_settings?.show_fee_on_portal ?? false}
      />
    </div>
  )
}
