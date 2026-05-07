import type { Tenant } from '@quote-engine/db'

export type LandingService = {
  name: string
  description: string
  icon: string
}

export type LandingTestimonial = {
  name: string
  text: string
  rating: number
  date?: string
}

export type TenantLandingData = {
  doctorName: string
  specialty: string
  subSpecialty?: string
  tagline?: string
  address: string
  phone: string
  email: string
  consultationFee: number
  schedule: Record<string, { enabled: boolean; start: string; end: string }>
  rating: number
  reviewCount: number
  yearsExperience: number
  patientCount: string
  services: LandingService[]
  testimonials: LandingTestimonial[]
  whatsappLink: string
  ctaLink: string
  initials: string
  /**
   * Optional URL to a doctor portrait. Read from
   * `tenant.config.landing.portraitUrl`. When present the Hero swaps the
   * initials avatar for a real image. When absent the Hero falls back to a
   * stylized SVG silhouette (NOT initials-only) so the landing never looks
   * empty.
   */
  portraitUrl?: string
  /**
   * Doctor gender hint for the SVG silhouette fallback. Read from
   * `tenant.config.medical.gender` ('female' | 'male'). Defaults to 'female'
   * because the seed tenant (Dra. Martínez) is female and most current
   * customers are women dermatologists/dentists.
   */
  portraitGender?: 'female' | 'male'
}

export function buildLandingData(tenant: Tenant): TenantLandingData {
  const config = (tenant.config ?? {}) as Record<string, any>
  const contact = config.contact ?? {}
  const medical = config.medical ?? {}
  const landing = config.landing ?? {}
  const schedule = config.schedule ?? {}

  const doctorName = tenant.name || 'Doctor'
  const phone = contact.phone || ''
  const whatsappPhone = (contact.whatsapp || phone).replace(/\D/g, '')

  // Build initials from name
  const words = doctorName.replace(/^(Dra?\.\s*)/i, '').split(/\s+/)
  const initials = words.map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()

  // Infer doctor gender from the name prefix (Spanish): "Dra." → female,
  // "Dr." → male. Override available via tenant.config.medical.gender.
  // Used by the Hero to pick the right SVG silhouette when no real
  // photo (config.landing.portrait_url) is uploaded.
  const explicitGender = (medical.gender as string | undefined)?.toLowerCase()
  const inferredGender = /^dra\.?/i.test(doctorName)
    ? 'female'
    : /^dr\.?/i.test(doctorName)
      ? 'male'
      : undefined
  const portraitGender: 'female' | 'male' =
    explicitGender === 'female' || explicitGender === 'male'
      ? (explicitGender as 'female' | 'male')
      : (inferredGender as 'female' | 'male' | undefined) ?? 'female'

  return {
    doctorName,
    specialty: medical.specialty || 'Medicina',
    subSpecialty: medical.sub_specialty,
    tagline: landing.tagline,
    address: contact.address || '',
    phone,
    email: contact.email || '',
    consultationFee: medical.consultation_fee || 0,
    schedule,
    rating: landing.rating ?? 5.0,
    reviewCount: landing.review_count ?? 0,
    yearsExperience: landing.years_experience ?? 0,
    patientCount: landing.patient_count ?? '',
    services: landing.services ?? [],
    testimonials: landing.testimonials ?? [],
    whatsappLink: whatsappPhone
      ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent('Hola, me gustaría agendar una cita.')}`
      : '/agendar',
    ctaLink: '/agendar',
    initials,
    portraitUrl: typeof landing.portrait_url === 'string' ? landing.portrait_url : undefined,
    portraitGender,
  }
}
