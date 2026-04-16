import { headers } from 'next/headers';
import { db, tenants, type Tenant, type TenantConfig } from '@quote-engine/db';
import { eq } from 'drizzle-orm';
import { cache } from 'react';

// Cached per-request tenant resolution
export const getTenant = cache(async (): Promise<Tenant | null> => {
  const headersList = await headers();
  const slug = headersList.get('x-tenant-slug');

  if (!slug) return null;

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);

  return tenant || null;
});

// Get typed config from tenant
export function getTenantConfig(tenant: Tenant): TenantConfig {
  return tenant.config as TenantConfig;
}

// Generate CSS variables from tenant colors
export function tenantCssVars(config: TenantConfig): Record<string, string> {
  return {
    '--tenant-primary': config.colors.primary,
    '--tenant-secondary': config.colors.secondary,
    '--tenant-bg': config.colors.background,
  };
}

// Format currency for tenant
export function formatCurrency(amount: number | string, config: TenantConfig): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: config.quote_settings!.currency,
    minimumFractionDigits: 2,
  }).format(num);
}
