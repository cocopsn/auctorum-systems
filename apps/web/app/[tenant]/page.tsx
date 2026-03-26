import { db, tenants, products } from '@quote-engine/db';
import { eq, and } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import type { TenantConfig } from '@quote-engine/db';
import CatalogPageClient from '../../components/catalog/CatalogPageClient';
import { getMockTenant, getMockProducts } from '../../lib/mock-data';

interface TenantPageProps {
  params: { tenant: string };
}

export default async function TenantPage({ params }: TenantPageProps) {
  let tenantData: any;
  let tenantProducts: any[];

  try {
    const [t] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, params.tenant))
      .limit(1);

    if (!t || !t.isActive) return notFound();
    tenantData = t;

    tenantProducts = await db
      .select()
      .from(products)
      .where(and(eq(products.tenantId, t.id), eq(products.isActive, true)))
      .orderBy(products.sortOrder);
  } catch {
    // DB unavailable — fall back to mock data for dev
    const mock = getMockTenant(params.tenant);
    if (!mock) return notFound();
    tenantData = mock;
    tenantProducts = getMockProducts(mock.id);
  }

  const config = tenantData.config as TenantConfig;

  return (
    <>
      {/* JSON-LD Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'LocalBusiness',
            name: tenantData.name,
            description: config.business.giro,
            address: {
              '@type': 'PostalAddress',
              streetAddress: config.contact.address,
            },
            telephone: config.contact.phone,
            email: config.contact.email,
            url: `https://${params.tenant}.auctorum.com.mx`,
            ...(tenantData.logoUrl ? { image: tenantData.logoUrl } : {}),
            priceRange: '$$',
            openingHoursSpecification: {
              '@type': 'OpeningHoursSpecification',
              dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
              opens: '08:00',
              closes: '18:00',
            },
            makesOffer: tenantProducts.slice(0, 5).map((p: any) => ({
              '@type': 'Offer',
              itemOffered: {
                '@type': 'Product',
                name: p.name,
                description: p.description,
                sku: p.sku,
              },
              price: p.unitPrice,
              priceCurrency: config.quote_settings?.currency || 'MXN',
            })),
          }),
        }}
      />
      <CatalogPageClient
        products={tenantProducts}
        tenantName={tenantData.name}
        tenantConfig={config}
      />
    </>
  );
}

export async function generateMetadata({ params }: TenantPageProps) {
  try {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, params.tenant))
      .limit(1);

    if (!tenant) return {};
    const config = tenant.config as TenantConfig;
    const title = `${tenant.name} — Cotizacion en linea`;
    const description = `Solicite su cotizacion de ${config.business.giro} al instante. ${tenant.name}, ${config.contact.address}`;
    const url = `https://${params.tenant}.auctorum.com.mx`;
    return {
      title,
      description,
      openGraph: { title, description, url, type: 'website', siteName: tenant.name },
      twitter: { card: 'summary', title, description },
      alternates: { canonical: url },
      robots: { index: true, follow: true },
    };
  } catch {
    const mock = getMockTenant(params.tenant);
    if (!mock) return { title: 'Portal de Cotizaciones' };
    const config = mock.config as TenantConfig;
    const title = `${mock.name} — Cotizacion en linea`;
    const description = `Solicite su cotizacion de ${config.business.giro} al instante.`;
    return {
      title,
      description,
      openGraph: { title, description, type: 'website', siteName: mock.name },
      twitter: { card: 'summary', title, description },
    };
  }
}
