import { db, quotes, products, tenants } from '@quote-engine/db';
import { eq, desc, sql, and, gte } from 'drizzle-orm';
import { headers } from 'next/headers';
import type { TenantConfig } from '@quote-engine/db';

// ============================================================
// Dashboard home: metrics cards + recent quotes table
// URL: cotizarapido.mx/dashboard (authenticated, filtered by tenant)
// ============================================================

async function getDashboardData(tenantId: string) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Total quotes this month
  const [monthStats] = await db
    .select({
      count: sql<number>`count(*)::int`,
      total: sql<number>`coalesce(sum(total::numeric), 0)`,
    })
    .from(quotes)
    .where(and(eq(quotes.tenantId, tenantId), gte(quotes.createdAt, thirtyDaysAgo)));

  // Quotes this week
  const [weekStats] = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(quotes)
    .where(and(eq(quotes.tenantId, tenantId), gte(quotes.createdAt, sevenDaysAgo)));

  // Total products
  const [productCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(products)
    .where(and(eq(products.tenantId, tenantId), eq(products.isActive, true)));

  // Recent quotes (last 10)
  const recentQuotes = await db
    .select()
    .from(quotes)
    .where(eq(quotes.tenantId, tenantId))
    .orderBy(desc(quotes.createdAt))
    .limit(10);

  return { monthStats, weekStats, productCount, recentQuotes };
}

function formatMXN(amount: number | string) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num);
}

function formatDate(date: Date | null) {
  if (!date) return '-';
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  }).format(new Date(date));
}

export default async function DashboardPage() {
  // Get tenant from header (set by middleware)
  const headersList = await headers();
  const tenantSlug = headersList.get('x-tenant-slug');

  // For now, hardcode a tenant for development. In production, resolve from auth session.
  // TODO: Replace with actual auth-based tenant resolution
  const [tenant] = await db.select().from(tenants).limit(1);
  if (!tenant) return <div className="p-8">No tenant configured</div>;

  const { monthStats, weekStats, productCount, recentQuotes } = await getDashboardData(tenant.id);

  const statusColors: Record<string, string> = {
    generated: 'bg-gray-100 text-gray-700',
    sent: 'bg-blue-100 text-blue-700',
    viewed: 'bg-yellow-100 text-yellow-700',
    accepted: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  };

  const statusLabels: Record<string, string> = {
    generated: 'Generada',
    sent: 'Enviada',
    viewed: 'Vista',
    accepted: 'Aceptada',
    rejected: 'Rechazada',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">{tenant.name}</h1>
        <p className="text-sm text-gray-500">Panel de administración</p>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Metric cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg border p-5">
            <p className="text-sm text-gray-500">Cotizaciones (30 días)</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{monthStats.count}</p>
          </div>
          <div className="bg-white rounded-lg border p-5">
            <p className="text-sm text-gray-500">Monto cotizado (30 días)</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{formatMXN(monthStats.total)}</p>
          </div>
          <div className="bg-white rounded-lg border p-5">
            <p className="text-sm text-gray-500">Esta semana</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{weekStats.count}</p>
          </div>
          <div className="bg-white rounded-lg border p-5">
            <p className="text-sm text-gray-500">Productos activos</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{productCount.count}</p>
          </div>
        </div>

        {/* Recent quotes table */}
        <div className="bg-white rounded-lg border">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold text-gray-900">Cotizaciones recientes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">#</th>
                  <th className="text-left px-5 py-3 font-medium">Cliente</th>
                  <th className="text-left px-5 py-3 font-medium">Empresa</th>
                  <th className="text-right px-5 py-3 font-medium">Total</th>
                  <th className="text-center px-5 py-3 font-medium">Estatus</th>
                  <th className="text-right px-5 py-3 font-medium">Fecha</th>
                  <th className="text-center px-5 py-3 font-medium">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentQuotes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400">
                      No hay cotizaciones todavía. Comparta su portal para empezar a recibir.
                    </td>
                  </tr>
                ) : (
                  recentQuotes.map(q => (
                    <tr key={q.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-mono text-gray-400">
                        {String(q.quoteNumber).padStart(4, '0')}
                      </td>
                      <td className="px-5 py-3 font-medium text-gray-900">{q.clientName}</td>
                      <td className="px-5 py-3 text-gray-600">{q.clientCompany}</td>
                      <td className="px-5 py-3 text-right font-semibold">{formatMXN(q.total)}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[q.status || 'generated']}`}>
                          {statusLabels[q.status || 'generated']}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-gray-500">
                        {formatDate(q.createdAt)}
                      </td>
                      <td className="px-5 py-3 text-center">
                        {q.pdfUrl && (
                          <a href={q.pdfUrl} target="_blank" className="text-blue-600 hover:underline text-xs">
                            Descargar
                          </a>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
