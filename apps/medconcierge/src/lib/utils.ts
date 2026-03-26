import type { TenantConfig } from '@quote-engine/db'

export function getTenantConfig(tenant: { config: unknown }): TenantConfig {
  return tenant.config as TenantConfig
}

export function tenantCssVars(config: TenantConfig): Record<string, string> {
  return {
    '--tenant-primary': config.colors.primary,
    '--tenant-secondary': config.colors.secondary,
    '--tenant-accent': config.colors.accent ?? config.colors.primary,
    '--tenant-bg': config.colors.background,
  }
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('52')) return `+${digits}`
  if (digits.startsWith('1') && digits.length === 10) return `+52${digits}`
  if (digits.length === 10) return `+52${digits}`
  return `+${digits}`
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount)
}
