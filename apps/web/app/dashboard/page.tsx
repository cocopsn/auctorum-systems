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

const statusConfig: Record<string, { label: string; color: string }> = {
  generated: { label: 'Generada', color: 'text-[var(--text-tertiary)] bg-[var(--bg-tertiary)]' },
  sent:      { label: 'Enviada', color: 'text-[var(--accent)] bg-[var(--accent-muted)]' },
  viewed:    { label: 'Vista', color: 'text-[var(--warning)] bg-[var(--warning)]/10' },
  accepted:  { label: 'Aceptada', color: 'text-[var(--success)] bg-[var(--success)]/10' },
  rejected:  { label: 'Rechazada', color: 'text-[var(--error)] bg-[var(--error)]/10' },
  expired:   { label: 'Vencida', color: 'text-[var(--text-tertiary)] bg-[var(--bg-tertiary)]' },
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
    tenantData = MOCK_TENANT;
    dashData = getMockDashboardData();
  }

  const { monthStats, weekStats, acceptedStats, productCount, recentQuotes } = dashData;
  const conversionRate = monthStats.count > 0
    ? Math.round((acceptedStats.count / monthStats.count) * 100)
    : 0;

  const kpiCards = [
    { label: 'Cotizaciones (30d)', value: monthStats.count, sub: `Esta semana: ${weekStats.count}`, icon: FileText, up: weekStats.count > 0 },
    { label: 'Monto cotizado', value: formatMXN(monthStats.total), sub: 'MXN + IVA', icon: DollarSign, up: monthStats.total > 0 },
    { label: 'Tasa de aceptación', value: `${conversionRate}%`, sub: `${acceptedStats.count} aceptadas`, icon: TrendingUp, up: conversionRate >= 50 },
    { label: 'Productos activos', value: productCount.count, sub: 'en catálogo', icon: Package, up: null },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">{tenantData.name}</h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-0.5">Panel de administración</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpiCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--border-hover)] transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--accent-muted)] flex items-center justify-center">
                  <Icon className="h-4 w-4 text-[var(--accent)]" />
                </div>
                {card.up === true && <ArrowUpRight className="h-4 w-4 text-[var(--success)]" />}
                {card.up === false && <ArrowDownRight className="h-4 w-4 text-[var(--warning)]" />}
              </div>
              <p className="text-[11px] font-mono text-[var(--text-tertiary)] uppercase tracking-wide">{card.label}</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1 tracking-tight">{card.value}</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Quotes */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Cotizaciones recientes</h2>
          <a
            href="/dashboard/quotes"
            className="inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
          >
            Ver todas
            <ArrowRight className="h-3 w-3" />
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--border)]">
              <tr className="text-[var(--text-tertiary)]">
                <th className="text-left px-6 py-3 text-[11px] font-mono uppercase tracking-wide">#</th>
                <th className="text-left px-6 py-3 text-[11px] font-mono uppercase tracking-wide">Cliente</th>
                <th className="text-left px-6 py-3 text-[11px] font-mono uppercase tracking-wide hidden md:table-cell">Empresa</th>
                <th className="text-right px-6 py-3 text-[11px] font-mono uppercase tracking-wide">Total</th>
                <th className="text-center px-6 py-3 text-[11px] font-mono uppercase tracking-wide">Estatus</th>
                <th className="text-right px-6 py-3 text-[11px] font-mono uppercase tracking-wide hidden sm:table-cell">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {recentQuotes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-[var(--text-tertiary)]">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No hay cotizaciones todavía</p>
                  </td>
                </tr>
              ) : (
                recentQuotes.map((q: any) => {
                  const status = statusConfig[q.status || 'generated'];
                  return (
                    <tr key={q.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                      <td className="px-6 py-3 font-mono text-[var(--text-tertiary)] text-xs">
                        {String(q.quoteNumber).padStart(4, '0')}
                      </td>
                      <td className="px-6 py-3 font-medium text-[var(--text-primary)]">{q.clientName}</td>
                      <td className="px-6 py-3 text-[var(--text-secondary)] hidden md:table-cell">{q.clientCompany}</td>
                      <td className="px-6 py-3 text-right font-mono font-medium text-[var(--text-primary)]">{formatMXN(q.total)}</td>
                      <td className="px-6 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right text-xs text-[var(--text-tertiary)] hidden sm:table-cell">
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
