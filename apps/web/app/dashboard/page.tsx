import { db, quotes, products, tenants, type Quote } from '@quote-engine/db';
import { eq, desc, sql, and, gte } from 'drizzle-orm';
import { getTenant } from '@/lib/tenant';
import { MOCK_TENANT, MOCK_PRODUCTS, MOCK_QUOTES } from '@/lib/mock-data';
import {
  FileText,
  DollarSign,
  TrendingUp,
  Package,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

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

const statusConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  generated: { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400', label: 'Generada' },
  sent:      { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Enviada' },
  viewed:    { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Vista' },
  accepted:  { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Aceptada' },
  rejected:  { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', label: 'Rechazada' },
  expired:   { bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-gray-400', label: 'Vencida' },
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

  const kpiCards = [
    {
      label: 'Cotizaciones (30 dias)',
      value: monthStats.count,
      sub: `Esta semana: ${weekStats.count}`,
      icon: FileText,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      cardBg: 'bg-gradient-to-br from-blue-50 to-white',
      trend: weekStats.count > 0 ? 'up' as const : null,
    },
    {
      label: 'Monto cotizado (30 dias)',
      value: formatMXN(monthStats.total),
      sub: 'MXN + IVA',
      icon: DollarSign,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      cardBg: 'bg-gradient-to-br from-emerald-50 to-white',
      trend: monthStats.total > 0 ? 'up' as const : null,
    },
    {
      label: 'Tasa de aceptacion',
      value: `${conversionRate}%`,
      sub: `${acceptedStats.count} aceptadas`,
      icon: TrendingUp,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      cardBg: 'bg-gradient-to-br from-amber-50 to-white',
      trend: conversionRate >= 50 ? 'up' as const : conversionRate > 0 ? 'down' as const : null,
    },
    {
      label: 'Productos activos',
      value: productCount.count,
      sub: 'en catalogo',
      icon: Package,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      cardBg: 'bg-gradient-to-br from-purple-50 to-white',
      trend: null,
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{tenantData.name}</h1>
        <p className="text-sm text-gray-500 mt-1">Panel de administracion</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {kpiCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className={`${card.cardBg} rounded-2xl border border-gray-100 p-5 transition-all duration-200 hover:shadow-md hover:shadow-gray-200/50`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.iconBg}`}>
                  <Icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
                {card.trend === 'up' && (
                  <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5">
                    <ArrowUpRight className="h-3 w-3" />
                  </span>
                )}
                {card.trend === 'down' && (
                  <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-amber-600 bg-amber-50 rounded-full px-2 py-0.5">
                    <ArrowDownRight className="h-3 w-3" />
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{card.label}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1 tracking-tight">{card.value}</p>
              <p className="text-xs text-gray-400 mt-1.5">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Quotes Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Cotizaciones recientes</h2>
          <a
            href="/dashboard/quotes"
            className="group inline-flex items-center gap-1 text-sm font-medium text-[#1B3A5C] hover:text-[#1B3A5C]/80 transition-colors"
          >
            Ver todas
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 text-gray-500 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-xs uppercase tracking-wider">#</th>
                <th className="text-left px-6 py-3 font-medium text-xs uppercase tracking-wider">Cliente</th>
                <th className="text-left px-6 py-3 font-medium text-xs uppercase tracking-wider hidden md:table-cell">Empresa</th>
                <th className="text-right px-6 py-3 font-medium text-xs uppercase tracking-wider">Total</th>
                <th className="text-center px-6 py-3 font-medium text-xs uppercase tracking-wider">Estatus</th>
                <th className="text-right px-6 py-3 font-medium text-xs uppercase tracking-wider hidden sm:table-cell">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentQuotes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-20 text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                        <FileText className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="font-medium text-gray-500">No hay cotizaciones todavia</p>
                      <p className="text-xs">Comparta su portal para empezar a recibir cotizaciones</p>
                    </div>
                  </td>
                </tr>
              ) : (
                recentQuotes.map((q: any) => {
                  const status = statusConfig[q.status || 'generated'];
                  return (
                    <tr key={q.id} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3.5 font-mono text-gray-400 text-xs">
                        {String(q.quoteNumber).padStart(4, '0')}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="font-semibold text-gray-900">{q.clientName}</span>
                      </td>
                      <td className="px-6 py-3.5 text-gray-500 hidden md:table-cell">{q.clientCompany}</td>
                      <td className="px-6 py-3.5 text-right font-bold tabular-nums text-gray-900">{formatMXN(q.total)}</td>
                      <td className="px-6 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${status.bg} ${status.text}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right text-gray-400 text-xs hidden sm:table-cell">
                        {formatDate(q.createdAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
