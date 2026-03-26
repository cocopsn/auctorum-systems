import { notFound } from 'next/navigation';
import { db, tenants } from '@quote-engine/db';
import { eq } from 'drizzle-orm';
import type { TenantConfig } from '@quote-engine/db';
import { getMockTenant } from '../../lib/mock-data';

interface TenantLayoutProps {
  children: React.ReactNode;
  params: { tenant: string };
}

async function getTenantBySlug(slug: string) {
  try {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1);
    return tenant ?? null;
  } catch {
    // DB unavailable — use mock
    return getMockTenant(slug);
  }
}

export default async function TenantLayout({ children, params }: TenantLayoutProps) {
  const tenant = await getTenantBySlug(params.tenant);
  if (!tenant || !tenant.isActive) return notFound();

  const config = tenant.config as TenantConfig;

  return (
    <div
      className="min-h-screen"
      style={{
        '--tenant-primary': config.colors.primary,
        '--tenant-secondary': config.colors.secondary,
        '--tenant-bg': config.colors.background,
      } as React.CSSProperties}
    >
      <header className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {tenant.logoUrl && (
              <img src={tenant.logoUrl} alt={tenant.name} className="h-10 w-auto object-contain" />
            )}
            <div>
              <h1 className="text-lg font-semibold" style={{ color: 'var(--tenant-primary)' }}>
                {tenant.name}
              </h1>
              <p className="text-xs text-gray-500">{config.business.giro}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            {config.contact.phone && (
              <a href={`tel:${config.contact.phone}`} className="hover:underline">{config.contact.phone}</a>
            )}
            {config.contact.whatsapp && (
              <a
                href={`https://wa.me/${config.contact.whatsapp.replace(/\D/g, '')}`}
                className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-white text-xs font-medium"
                style={{ backgroundColor: 'var(--tenant-primary)' }}
                target="_blank"
              >
                WhatsApp
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>

      <footer className="border-t bg-gray-50 mt-auto">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center text-xs text-gray-400">
          <p>{config.business.razon_social}</p>
          {config.contact.address && <p className="mt-1">{config.contact.address}</p>}
          <p className="mt-2">Powered by <strong>Auctorum Systems</strong></p>
        </div>
      </footer>
    </div>
  );
}
