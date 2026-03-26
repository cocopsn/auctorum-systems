import { db, tenants } from '@quote-engine/db';
import { getTenant } from '@/lib/tenant';
import { getTenantConfig } from '@/lib/tenant';
import SettingsClient from '@/components/dashboard/SettingsClient';

export default async function SettingsPage() {
  let tenant = await getTenant();
  if (!tenant) {
    const [first] = await db.select().from(tenants).limit(1);
    tenant = first ?? null;
  }

  if (!tenant) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">No hay tenant configurado.</p>
      </div>
    );
  }

  const config = getTenantConfig(tenant);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-500 mt-0.5">Personalice su portal de cotizaciones</p>
      </div>
      <SettingsClient
        tenantSlug={tenant.slug}
        tenantName={tenant.name}
        logoUrl={tenant.logoUrl ?? ''}
        config={config}
      />
    </div>
  );
}
