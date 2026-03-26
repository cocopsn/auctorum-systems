import { notFound } from 'next/navigation';
import { db, tenants } from '@quote-engine/db';
import { eq } from 'drizzle-orm';
import type { TenantConfig } from '@quote-engine/db';
import { getMockTenant } from '../../lib/mock-data';
import { Phone, MessageCircle } from 'lucide-react';

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
      className="min-h-screen flex flex-col"
      style={{
        '--tenant-primary': config.colors.primary,
        '--tenant-secondary': config.colors.secondary,
        '--tenant-bg': config.colors.background,
      } as React.CSSProperties}
    >
      <header className="sticky top-0 z-40 border-b border-white/10 bg-white/80 backdrop-blur-md shadow-lg">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {tenant.logoUrl && (
              <div className="relative">
                <img
                  src={tenant.logoUrl}
                  alt={tenant.name}
                  className="h-11 w-11 rounded-xl object-contain ring-2 ring-tenant-primary/20 shadow-md"
                />
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold tracking-tight text-tenant-primary">
                {tenant.name}
              </h1>
              <span className="inline-flex items-center rounded-md bg-tenant-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-tenant-primary">
                {config.business.giro}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {config.contact.phone && (
              <a
                href={`tel:${config.contact.phone}`}
                className="group inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:border-tenant-primary/30 hover:shadow-md hover:text-tenant-primary"
              >
                <Phone className="h-4 w-4 text-gray-400 transition-colors group-hover:text-tenant-primary" />
                <span className="hidden sm:inline">{config.contact.phone}</span>
              </a>
            )}
            {config.contact.whatsapp && (
              <a
                href={`https://wa.me/${config.contact.whatsapp.replace(/\D/g, '')}`}
                className="group inline-flex items-center gap-2 rounded-lg bg-tenant-primary px-4 py-2 text-sm font-semibold text-white shadow-md shadow-tenant-primary/25 transition-all hover:shadow-lg hover:shadow-tenant-primary/30 hover:brightness-110"
                target="_blank"
              >
                <MessageCircle className="h-4 w-4" />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8">{children}</main>

      <footer className="mt-auto border-t border-gray-100 bg-gray-50/80">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-sm font-medium text-gray-600">{config.business.razon_social}</p>
            {config.contact.address && (
              <p className="text-xs text-gray-400 max-w-md">{config.contact.address}</p>
            )}
            <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
              <span>Powered by</span>
              <span className="font-semibold bg-gradient-to-r from-slate-600 to-slate-800 bg-clip-text text-transparent">
                Auctorum Systems
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
