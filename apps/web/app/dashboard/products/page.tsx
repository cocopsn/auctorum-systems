import { db, products } from '@quote-engine/db';
import { eq, and, asc } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import ProductsClient from '@/components/dashboard/ProductsClient';

export default async function ProductsPage() {
  const { tenant } = await requireAuth();

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
