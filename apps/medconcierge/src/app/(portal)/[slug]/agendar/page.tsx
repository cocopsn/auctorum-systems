import { notFound } from 'next/navigation'
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
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Agendar Cita</h2>
      <p className="text-gray-500 mb-6">
        Seleccione un día y horario disponible para su consulta con {tenant.name}.
      </p>
      <BookingWizard
        tenantId={tenant.id}
        tenantName={tenant.name}
        slug={params.slug}
        insuranceProviders={config.medical!.insurance_providers}
        address={config.contact.address}
        fee={config.medical!.consultation_fee}
        showFee={config.schedule_settings!.show_fee_on_portal}
      />
    </div>
  )
}
