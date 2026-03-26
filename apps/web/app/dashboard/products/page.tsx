import { db, products, tenants } from '@quote-engine/db';
import { eq, and, asc } from 'drizzle-orm';
import { getTenant } from '@/lib/tenant';
import ProductsClient from '@/components/dashboard/ProductsClient';

export default async function ProductsPage() {
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

  const tenantProducts = await db
    .select()
    .from(products)
    .where(and(eq(products.tenantId, tenant.id), eq(products.isActive, true)))
    .orderBy(asc(products.sortOrder), asc(products.name));

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
        <p className="text-sm text-gray-500 mt-0.5">Catálogo de productos del tenant</p>
      </div>
      <ProductsClient
        initialProducts={tenantProducts}
        tenantSlug={tenant.slug}
      />
    </div>
  );
}
