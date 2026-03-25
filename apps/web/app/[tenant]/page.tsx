import { db, tenants, products } from '@quote-engine/db';
import { eq, and } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import type { TenantConfig } from '@quote-engine/db';
import CatalogPageClient from '../../components/catalog/CatalogPageClient';

interface TenantPageProps {
  params: { tenant: string };
}

export default async function TenantPage({ params }: TenantPageProps) {
  // Fetch tenant
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, params.tenant))
    .limit(1);

  if (!tenant || !tenant.isActive) return notFound();

  // Fetch active products ordered by sort_order
  const tenantProducts = await db
    .select()
    .from(products)
    .where(and(eq(products.tenantId, tenant.id), eq(products.isActive, true)))
    .orderBy(products.sortOrder);

  const config = tenant.config as TenantConfig;

  return (
    <CatalogPageClient
      products={tenantProducts}
      tenantName={tenant.name}
      tenantConfig={config}
    />
  );
}

// SEO metadata per tenant
export async function generateMetadata({ params }: TenantPageProps) {
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, params.tenant))
    .limit(1);

  if (!tenant) return {};

  const config = tenant.config as TenantConfig;

  return {
    title: `${tenant.name} — Cotización en línea`,
    description: `Solicite su cotización de ${config.business.giro} al instante. ${tenant.name}, ${config.contact.address}`,
  };
}
