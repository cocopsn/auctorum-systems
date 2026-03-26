import { db, quotes, products, tenants, type Quote } from '@quote-engine/db';
import { eq, desc, sql, and, gte } from 'drizzle-orm';
import { getTenant } from '@/lib/tenant';
import { MOCK_TENANT, MOCK_PRODUCTS, MOCK_QUOTES } from '@/lib/mock-data';

export const dynamic = 'force-dynamic';

async function getDashboardData(tenantId: string) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [monthStats] = await db
    .select({
      count: sql<number>`count(*)::int`,
      total: sql<number>`coalesce(sum(total::numeric), 0)`,
    })
    .from(quotes)
    .where(and(eq(quotes.tenantId, tenantId), gte(quotes.createdAt, thirtyDaysAgo)));

  const [weekStats] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(quotes)
    .where(and(eq(quotes.tenantId, tenantId), gte(quotes.createdAt, sevenDaysAgo)));

  const [acceptedStats] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(quotes)
    .where(and(
      eq(quotes.tenantId, tenantId),
      eq(quotes.status, 'accepted'),
      gte(quotes.createdAt, thirtyDaysAgo),
    ));

  const [productCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(products)
    .where(and(eq(products.tenantId, tenantId), eq(products.isActive, true)));

  const recentQuotes = await db
    .select()
    .from(quotes)
    .where(eq(quotes.tenantId, tenantId))
    .orderBy(desc(quotes.createdAt))
    .limit(10);

  return { monthStats, weekStats, acceptedStats, productCount, recentQuotes };
}

function getMockDashboardData() {
  const accepted = MOCK_QUOTES.filter(q => q.status === 'accepted');
  return {
    monthStats: { count: MOCK_QUOTES.length, total: MOCK_QUOTES.reduce((s, q) => s + parseFloat(q.total), 0) },
    weekStats: { count: 2 },
    acceptedStats: { count: accepted.length },
    productCount: { count: MOCK_PRODUCTS.length },
    recentQuotes: MOCK_QUOTES,
  };
}

function formatMXN(amount: number | string) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num);
}

function formatDate(date: Date | null) {
  if (!date) return '-';
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(new Date(date));
}

const statusColors: Record<string, string> = {
  generated: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-yellow-100 text-yellow-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  expired: 'bg-gray-100 text-gray-500',
};

const statusLabels: Record<string, string> = {
  generated: 'Generada',
  sent: 'Enviada',
  viewed: 'Vista',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  expired: 'Vencida',
};

export default async function DashboardPage() {
  let tenantData: any;
  let dashData: any;

  try {
    let tenant = await getTenant();
    if (!tenant) {
      const [first] = await db.select().from(tenants).limit(1);
      tenant = first ?? null;
    }
    if (!tenant) throw new Error('no tenant');
    tenantData = tenant;
    dashData = await getDashboardData(tenant.id);
  } catch {
    // DB unavailable — use mock data
    tenantData = MOCK_TENANT;
    dashData = getMockDashboardData();
  }

  const { monthStats, weekStats, acceptedStats, productCount, recentQuotes } = dashData;
  const conversionRate = monthStats.count > 0
    ? Math.round((acceptedStats.count / monthStats.count) * 100)
    : 0;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{tenantData.name}</h1>
        <p className="text-sm text-gray-500">Panel de administracion</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cotizaciones (30 dias)</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{monthStats.count}</p>
          <p className="text-xs text-gray-400 mt-1">Esta semana: {weekStats.count}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Monto cotizado (30 dias)</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{formatMXN(monthStats.total)}</p>
          <p className="text-xs text-gray-400 mt-1">MXN + IVA</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tasa de aceptacion</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{conversionRate}%</p>
          <p className="text-xs text-gray-400 mt-1">{acceptedStats.count} aceptadas</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Productos activos</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{productCount.count}</p>
          <p className="text-xs text-gray-400 mt-1">en catalogo</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Cotizaciones recientes</h2>
          <a href="/dashboard/quotes" className="text-sm text-[#1B3A5C] hover:underline">Ver todas →</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 font-medium">#</th>
                <th className="text-left px-6 py-3 font-medium">Cliente</th>
                <th className="text-left px-6 py-3 font-medium hidden md:table-cell">Empresa</th>
                <th className="text-right px-6 py-3 font-medium">Total</th>
                <th className="text-center px-6 py-3 font-medium">Estatus</th>
                <th className="text-right px-6 py-3 font-medium hidden sm:table-cell">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentQuotes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-gray-400">
                    <p className="font-medium">No hay cotizaciones todavia</p>
                    <p className="text-xs mt-1">Comparta su portal para empezar a recibir cotizaciones</p>
                  </td>
                </tr>
              ) : (
                recentQuotes.map((q: any) => (
                  <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 font-mono text-gray-400 text-xs">
                      {String(q.quoteNumber).padStart(4, '0')}
                    </td>
                    <td className="px-6 py-3 font-medium text-gray-900">{q.clientName}</td>
                    <td className="px-6 py-3 text-gray-500 hidden md:table-cell">{q.clientCompany}</td>
                    <td className="px-6 py-3 text-right font-semibold tabular-nums">{formatMXN(q.total)}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[q.status || 'generated']}`}>
                        {statusLabels[q.status || 'generated']}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right text-gray-400 text-xs hidden sm:table-cell">
                      {formatDate(q.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
