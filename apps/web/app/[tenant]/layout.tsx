import { notFound } from 'next/navigation';
import { db, tenants } from '@quote-engine/db';
import { eq } from 'drizzle-orm';
import type { TenantConfig } from '@quote-engine/db';
import { getMockTenant } from '../../lib/mock-data';
import { ShareButton } from '../../components/catalog/ShareButton';
import { TenantLogoBadge } from '../../components/tenant/TenantLogoBadge';

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
    return getMockTenant(slug);
  }
}

export default async function TenantLayout({ children, params }: TenantLayoutProps) {
  const tenant = await getTenantBySlug(params.tenant);
  if (!tenant || !tenant.isActive) return notFound();

  const config = tenant.config as TenantConfig;

  return (
    <div
      className="min-h-screen flex flex-col bg-[var(--bg-primary)]"
      style={{
        '--tenant-primary': config.colors.primary,
        '--tenant-secondary': config.colors.secondary,
        '--tenant-bg': config.colors.background,
      } as React.CSSProperties}
    >
      {/* Tenant Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg-primary)]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <TenantLogoBadge logoUrl={tenant.logoUrl} name={tenant.name} />
            <div>
              <h1 className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">
                {tenant.name}
              </h1>
              {config.business?.giro && (
                <span className="text-[11px] text-[var(--text-tertiary)] font-mono">
                  {config.business.giro}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ShareButton
              url={`https://${params.tenant}.auctorum.com.mx`}
              title={`${tenant.name} — Cotización en línea`}
            />
            {config.contact?.phone && (
              <a
                href={`tel:${config.contact.phone}`}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] border border-[var(--border)] rounded-lg px-3 py-1.5 hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                </svg>
                {config.contact.phone}
              </a>
            )}
            {config.contact?.whatsapp && (
              <a
                href={`https://wa.me/${config.contact.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-[var(--accent)] rounded-lg px-3 py-1.5 hover:bg-[var(--accent-hover)] transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                </svg>
                WhatsApp
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl px-6 py-8">{children}</main>

      {/* Tenant Footer */}
      <footer className="mt-auto border-t border-[var(--border)] py-6 px-6">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-[var(--text-tertiary)]">
            {config.business?.razon_social || tenant.name}
            {config.contact?.address && <span> &middot; {config.contact.address}</span>}
          </div>
          <p className="text-[11px] text-[var(--text-tertiary)]/50">
            Powered by{' '}
            <a href="https://auctorum.com.mx" className="hover:text-[var(--text-secondary)] transition-colors">
              Auctorum Systems
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
