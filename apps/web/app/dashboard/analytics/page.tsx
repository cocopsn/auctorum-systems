import { db, quotes, quoteItems, clients, tenants } from '@quote-engine/db';
import { eq, desc, sql, and, gte } from 'drizzle-orm';
import { getTenant } from '@/lib/tenant';
import { MOCK_TENANT, MOCK_QUOTES, MOCK_PRODUCTS } from '@/lib/mock-data';

export const dynamic = 'force-dynamic';

function formatMXN(amount: number | string) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num);
}

function getMockAnalytics() {
  const totalQuotes = MOCK_QUOTES.length;
  const accepted = MOCK_QUOTES.filter(q => q.status === 'accepted');
  const totalRevenue = accepted.reduce((s, q) => s + parseFloat(q.total), 0);
  const conversionRate = totalQuotes > 0 ? Math.round((accepted.length / totalQuotes) * 100) : 0;
  const avgQuoteValue = totalQuotes > 0 ? MOCK_QUOTES.reduce((s, q) => s + parseFloat(q.total), 0) / totalQuotes : 0;

  return {
    tenantName: MOCK_TENANT.name,
    totalQuotes,
    acceptedCount: accepted.length,
    totalRevenue,
    conversionRate,
    avgQuoteValue,
    avgResponseTime: '4.2 hrs',
    topProducts: [
      { name: 'Pieza torneada CNC', count: 15, revenue: 2775 },
      { name: 'Brida mecanizada', count: 8, revenue: 6000 },
      { name: 'Prototipo rapido aluminio', count: 6, revenue: 9000 },
      { name: 'Inserto de molde (EDM)', count: 4, revenue: 11200 },
      { name: 'Engrane recto modulo 2', count: 3, revenue: 1740 },
    ],
    topClients: [
      { company: 'Stellantis', quotes: 8, revenue: 98000, rate: 75 },
      { company: 'Magna International', quotes: 5, revenue: 32000, rate: 60 },
      { company: 'Lear Corporation', quotes: 3, revenue: 6496, rate: 33 },
    ],
    statusBreakdown: [
      { status: 'Aceptadas', count: 1, color: 'bg-[var(--success)]' },
      { status: 'Enviadas', count: 1, color: 'bg-[var(--accent)]' },
      { status: 'Vistas', count: 1, color: 'bg-[var(--warning)]' },
    ],
  };
}

async function getAnalytics(tenantId: string) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

  const [totals] = await db
    .select({
      count: sql<number>`count(*)::int`,
      total: sql<number>`coalesce(sum(total::numeric), 0)`,
    })
    .from(quotes)
    .where(and(eq(quotes.tenantId, tenantId), gte(quotes.createdAt, thirtyDaysAgo)));

  const [accepted] = await db
    .select({
      count: sql<number>`count(*)::int`,
      total: sql<number>`coalesce(sum(total::numeric), 0)`,
    })
    .from(quotes)
    .where(and(eq(quotes.tenantId, tenantId), eq(quotes.status, 'accepted'), gte(quotes.createdAt, thirtyDaysAgo)));

  const topProducts = await db
    .select({
      name: quoteItems.productName,
      count: sql<number>`sum(${quoteItems.quantity}::int)`,
      revenue: sql<number>`sum(${quoteItems.lineTotal}::numeric)`,
    })
    .from(quoteItems)
    .innerJoin(quotes, eq(quoteItems.quoteId, quotes.id))
    .where(eq(quotes.tenantId, tenantId))
    .groupBy(quoteItems.productName)
    .orderBy(sql`sum(${quoteItems.lineTotal}::numeric) DESC`)
    .limit(5);

  const topClients = await db
    .select({
      company: clients.company,
      quotes: clients.totalQuotes,
      revenue: clients.totalAcceptedAmount,
      rate: sql<number>`CASE WHEN total_quotes > 0 THEN round((total_accepted::numeric / total_quotes::numeric) * 100) ELSE 0 END`,
    })
    .from(clients)
    .where(eq(clients.tenantId, tenantId))
    .orderBy(desc(clients.totalQuotedAmount))
    .limit(5);

  const conversionRate = totals.count > 0 ? Math.round((accepted.count / totals.count) * 100) : 0;
  const avgQuoteValue = totals.count > 0 ? totals.total / totals.count : 0;

  return {
    totalQuotes: totals.count,
    acceptedCount: accepted.count,
    totalRevenue: accepted.total,
    conversionRate,
    avgQuoteValue,
    topProducts,
    topClients,
  };
}

export default async function AnalyticsPage() {
  let data: any;

  try {
    let tenant = await getTenant();
    if (!tenant) {
      const [first] = await db.select().from(tenants).limit(1);
      tenant = first ?? null;
    }
    if (!tenant) throw new Error('no tenant');

    const analytics = await getAnalytics(tenant.id);
    data = { tenantName: tenant.name, ...analytics };
  } catch {
    data = getMockAnalytics();
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Analytics</h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-0.5">Metricas de conversion, productos y clientes (30 dias)</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--border-hover)] transition-colors">
          <p className="text-[11px] font-mono text-[var(--text-tertiary)] uppercase tracking-wide">Tasa de conversion</p>
          <p className="text-4xl font-bold mt-2" style={{ color: data.conversionRate >= 50 ? 'var(--success)' : data.conversionRate >= 25 ? 'var(--warning)' : 'var(--error)' }}>
            {data.conversionRate}%
          </p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">{data.acceptedCount} de {data.totalQuotes} aceptadas</p>
        </div>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--border-hover)] transition-colors">
          <p className="text-[11px] font-mono text-[var(--text-tertiary)] uppercase tracking-wide">Revenue (aceptadas)</p>
          <p className="text-3xl font-bold text-[var(--text-primary)] mt-2">{formatMXN(data.totalRevenue)}</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">ultimos 30 dias</p>
        </div>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--border-hover)] transition-colors">
          <p className="text-[11px] font-mono text-[var(--text-tertiary)] uppercase tracking-wide">Ticket promedio</p>
          <p className="text-3xl font-bold text-[var(--text-primary)] mt-2">{formatMXN(data.avgQuoteValue)}</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">por cotizacion</p>
        </div>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--border-hover)] transition-colors">
          <p className="text-[11px] font-mono text-[var(--text-tertiary)] uppercase tracking-wide">Total cotizaciones</p>
          <p className="text-3xl font-bold text-[var(--text-primary)] mt-2">{data.totalQuotes}</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">generadas en 30 dias</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border)]">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Top productos cotizados</h2>
          </div>
          <div className="p-6 space-y-4">
            {data.topProducts && data.topProducts.length > 0 ? (
              data.topProducts.map((p: any, i: number) => {
                const maxRevenue = data.topProducts[0]?.revenue || 1;
                const width = Math.max(10, Math.round((p.revenue / maxRevenue) * 100));
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-[var(--text-secondary)] truncate mr-4">{p.name}</span>
                      <span className="text-[var(--text-tertiary)] whitespace-nowrap">{p.count} uds · {formatMXN(p.revenue)}</span>
                    </div>
                    <div className="w-full bg-[var(--bg-tertiary)] rounded-full h-2">
                      <div className="bg-[var(--accent)] h-2 rounded-full transition-all" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-[var(--text-tertiary)] py-8 text-sm">Sin datos de productos todavia</p>
            )}
          </div>
        </div>

        {/* Top Clients */}
        <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border)]">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Top clientes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--border)]">
                <tr className="text-[var(--text-tertiary)]">
                  <th className="text-left px-6 py-2.5 text-[11px] font-mono uppercase tracking-wide">Empresa</th>
                  <th className="text-right px-6 py-2.5 text-[11px] font-mono uppercase tracking-wide">Cotiz.</th>
                  <th className="text-right px-6 py-2.5 text-[11px] font-mono uppercase tracking-wide">Revenue</th>
                  <th className="text-right px-6 py-2.5 text-[11px] font-mono uppercase tracking-wide">Tasa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {data.topClients && data.topClients.length > 0 ? (
                  data.topClients.map((c: any, i: number) => (
                    <tr key={i} className="hover:bg-[var(--bg-elevated)] transition-colors">
                      <td className="px-6 py-3 font-medium text-[var(--text-primary)]">{c.company || 'Sin empresa'}</td>
                      <td className="px-6 py-3 text-right text-[var(--text-secondary)]">{c.quotes}</td>
                      <td className="px-6 py-3 text-right font-mono font-medium text-[var(--text-primary)]">{formatMXN(c.revenue || 0)}</td>
                      <td className="px-6 py-3 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${
                          (c.rate || 0) >= 50 ? 'text-[var(--success)] bg-[var(--success)]/10' :
                          (c.rate || 0) >= 25 ? 'text-[var(--warning)] bg-[var(--warning)]/10' :
                          'text-[var(--error)] bg-[var(--error)]/10'
                        }`}>
                          {c.rate || 0}%
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-[var(--text-tertiary)] text-sm">Sin datos de clientes todavia</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
