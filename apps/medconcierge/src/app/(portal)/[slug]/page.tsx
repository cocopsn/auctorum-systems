import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { getTenant, getTenantConfig, getDoctor } from '@/lib/tenant'
import { db } from '@quote-engine/db'
import { schedules } from '@quote-engine/db'
import { DoctorProfile } from '@/components/portal/doctor-profile'

export default async function PortalPage({
  params,
}: {
  params: { slug: string }
}) {
  const tenant = await getTenant(params.slug)
  if (!tenant) notFound()

  const config = getTenantConfig(tenant)
  const doctor = await getDoctor(tenant.id)
  if (!doctor) notFound()

  const doctorSchedules = await db
    .select()
    .from(schedules)
    .where(eq(schedules.tenantId, tenant.id))
    .orderBy(schedules.dayOfWeek)

  return (
    <DoctorProfile
      doctor={doctor}
      config={config}
      schedules={doctorSchedules}
      slug={params.slug}
    />
  )
}
