import { headers } from 'next/headers';
import { db, tenants, type Tenant, type TenantConfig } from '@quote-engine/db';
import { eq } from 'drizzle-orm';
import * as React from 'react';

// Cached per-request tenant resolution. `React.cache` is exported at runtime
// from React 18.3+ but its types only land in @types/react@19. Cast through
// any so we get the runtime memoization without depending on the newer types.
const reactCache = (React as unknown as { cache: <T extends (...args: any[]) => any>(fn: T) => T }).cache

export const getTenant = reactCache(async (): Promise<Tenant | null> => {
  const headersList = headers();
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
