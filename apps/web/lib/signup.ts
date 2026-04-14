import type { PortalSection, TenantConfig, TenantType, PublicSubdomainPrefix } from '@quote-engine/db'
import { DEFAULT_TENANT_CONFIG } from '@quote-engine/db'
import { APP_DOMAIN, PORTAL_HOST } from './hosts'

export function buildPublicSubdomain(
  prefix: PublicSubdomainPrefix,
  publicSlugBase: string,
) {
  return `${prefix}-${publicSlugBase}`.toLowerCase()
}

export function getTenantSlugForSignup(options: {
  tenantType: TenantType
  slug: string
  publicSubdomainPrefix?: PublicSubdomainPrefix
}) {
  if (options.tenantType === 'medical' && options.publicSubdomainPrefix) {
    return buildPublicSubdomain(options.publicSubdomainPrefix, options.slug)
  }

  return options.slug.toLowerCase()
}

export function buildTenantConfig(options: {
  tenantType: TenantType
  plan: string
  businessName: string
  doctorSpecialty?: string
  publicHost?: string
}): TenantConfig {
  return {
    ...DEFAULT_TENANT_CONFIG,
    account: {
      type: options.tenantType,
      plan: options.plan,
      portalHost: PORTAL_HOST,
      publicHost: options.publicHost,
    },
    business: {
      ...DEFAULT_TENANT_CONFIG.business,
      razon_social: options.businessName,
      giro: options.tenantType === 'medical' ? 'Consultorio medico' : '',
    },
    medical: options.tenantType === 'medical'
      ? {
          specialty: options.doctorSpecialty || '',
          sub_specialty: '',
          cedula_profesional: '',
          cedula_especialidad: '',
          consultation_fee: 0,
          consultation_duration_min: 30,
          accepts_insurance: false,
          insurance_providers: [],
        }
      : undefined,
  }
}

export function getDefaultMedicalPortalSections(options: {
  tenantName: string
  specialty?: string
  whatsapp?: string
}): PortalSection[] {
  const whatsappHref = options.whatsapp
    ? `https://wa.me/${options.whatsapp.replace(/\D/g, '')}`
    : '#contact'

  return [
    {
      id: crypto.randomUUID(),
      type: 'hero',
      visible: true,
      order: 0,
      data: {
        headline: options.tenantName,
        subheadline: options.specialty || 'Agenda tu consulta de forma simple',
        ctaText: 'Agendar cita',
        ctaLink: '#contact',
      },
    },
    {
      id: crypto.randomUUID(),
      type: 'about',
      visible: true,
      order: 1,
      data: {
        title: 'Sobre el consultorio',
        description: `Conoce a ${options.tenantName} y agenda tu cita con una experiencia moderna y clara.`,
      },
    },
    {
      id: crypto.randomUUID(),
      type: 'services',
      visible: true,
      order: 2,
      data: {
        title: 'Servicios',
        subtitle: 'Atencion medica y seguimiento',
        items: [],
      },
    },
    {
      id: crypto.randomUUID(),
      type: 'contact',
      visible: true,
      order: 3,
      data: {
        title: 'Contacto',
        whatsapp_link: whatsappHref,
      },
    },
    {
      id: crypto.randomUUID(),
      type: 'cta',
      visible: true,
      order: 4,
      data: {
        title: 'Agenda tu cita hoy',
        subtitle: 'Respuesta rapida por WhatsApp y portal de citas',
        buttonText: 'Escribir por WhatsApp',
        buttonLink: whatsappHref,
      },
    },
  ]
}

export function getDefaultMedicalSchedules(tenantId: string) {
  return [
    { tenantId, dayOfWeek: 1, startTime: '09:00:00', endTime: '14:00:00', slotDurationMin: 30, isActive: true },
    { tenantId, dayOfWeek: 2, startTime: '09:00:00', endTime: '14:00:00', slotDurationMin: 30, isActive: true },
    { tenantId, dayOfWeek: 3, startTime: '09:00:00', endTime: '14:00:00', slotDurationMin: 30, isActive: true },
    { tenantId, dayOfWeek: 4, startTime: '09:00:00', endTime: '14:00:00', slotDurationMin: 30, isActive: true },
    { tenantId, dayOfWeek: 5, startTime: '09:00:00', endTime: '14:00:00', slotDurationMin: 30, isActive: true },
  ]
}

export function buildPublicHost(publicSubdomain?: string | null) {
  return publicSubdomain ? `${publicSubdomain}.${APP_DOMAIN}` : null
}
