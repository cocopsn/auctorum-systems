const RESERVED_SLUGS = new Set([
  'www', 'api', 'app', 'admin', 'dashboard', 'login', 'signup',
  'systems', 'platform', 'mail', 'smtp', 'ftp', 'blog', 'help',
  'support', 'docs', 'status', 'auth', 'static', 'assets', 'cdn',
])

/**
 * Validates a tenant slug. Returns null if valid, otherwise a human-readable
 * Spanish error message.
 */
export function validateSlug(slug: string): string | null {
  if (!slug) return 'El subdominio es requerido'
  if (slug.length < 3) return 'Mínimo 3 caracteres'
  if (slug.length > 63) return 'Máximo 63 caracteres'
  if (!/^[a-z0-9-]+$/.test(slug)) return 'Solo letras minúsculas, números y guiones'
  if (slug.startsWith('-') || slug.endsWith('-')) return 'No puede empezar ni terminar con guion'
  if (slug.includes('--')) return 'No puede contener guiones consecutivos'
  if (RESERVED_SLUGS.has(slug)) return 'Este subdominio está reservado'
  return null
}

/**
 * Suggest a slug from a business name.
 * "Grupo Industrial López S.A." → "grupo-industrial-lopez-sa"
 */
export function suggestSlug(businessName: string): string {
  return businessName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 63)
}
