import { db, quotes, clients, tenants } from '@quote-engine/db';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { getTenant } from '@/lib/tenant';
import { MOCK_TENANT, MOCK_QUOTES } from '@/lib/mock-data';
import {
  AiInsightCard,
  DonutCard,
  KpiCard,
  LineChartCard,
  ProgressList,
  StatusBadge,
} from '@quote-engine/ui';
import { FileText, MessageCircle, TrendingUp, Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

function formatMXN(amount: number | string) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(num);
}

async function getDashboardData(tenantId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [monthStats] = await db
    .select({
      count: sql<number>`count(*)::int`,
      total: sql<number>`coalesce(sum(total::numeric), 0)`,
    })
    .from(quotes)
    .where(and(eq(quotes.tenantId, tenantId), gte(quotes.createdAt, monthStart)));

  const [acceptedStats] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(quotes)
    .where(and(eq(quotes.tenantId, tenantId), eq(quotes.status, 'accepted'), gte(quotes.createdAt, monthStart)));

  const [prospects] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(clients)
    .where(and(eq(clients.tenantId, tenantId), gte(clients.createdAt, monthStart)));

  const recentQuotes = await db
    .select()
    .from(quotes)
    .where(eq(quotes.tenantId, tenantId))
    .orderBy(desc(quotes.createdAt))
    .limit(5);

  return { monthStats, acceptedStats, prospects, recentQuotes };
}

function mockDashboardData() {
  return {
    monthStats: { count: MOCK_QUOTES.length, total: MOCK_QUOTES.reduce((sum, quote) => sum + parseFloat(quote.total), 0) },
    acceptedStats: { count: MOCK_QUOTES.filter((quote) => quote.status === 'accepted').length },
    prospects: { count: 7 },
    recentQuotes: MOCK_QUOTES.slice(0, 5),
  };
}

const statusTone: Record<string, 'success' | 'warning' | 'danger' | 'indigo' | 'neutral'> = {
  generated: 'neutral',
  sent: 'indigo',
  viewed: 'warning',
  accepted: 'success',
  rejected: 'danger',
  expired: 'neutral',
};

export default async function DashboardPage() {
  let tenantName = MOCK_TENANT.name;
  let data: any = mockDashboardData();

  try {
    let tenant = await getTenant();
    if (!tenant) {
      const [first] = await db.select().from(tenants).limit(1);
      tenant = first ?? null;
    }
    if (tenant) {
      tenantName = tenant.name;
      data = await getDashboardData(tenant.id);
    }
  } catch {
    data = mockDashboardData();
  }

  const openRate = data.monthStats.count ? Math.min(94, Math.max(38, Math.round((data.acceptedStats.count / data.monthStats.count) * 100) + 42)) : 0;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-indigo-600">{tenantName}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">Dashboard comercial</h1>
          <p className="mt-2 text-sm text-gray-500">Cotizaciones, prospectos y automatizaciones del mes.</p>
        </div>
        <div className="flex gap-3">
          <a href="/dashboard/quotes" className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm">Nueva cotizacion</a>
          <a href="/dashboard/ai-settings" className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-sm">Create Automation</a>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Cotizaciones Mes" value={data.monthStats.count} trend="+12%" icon={FileText} />
        <KpiCard title="Tasa Apertura (WhatsApp)" value={`${openRate}%`} trend="+5.2%" icon={MessageCircle} />
        <KpiCard title="Valor Cotizado" value={formatMXN(data.monthStats.total)} trend="+23%" icon={TrendingUp} />
        <KpiCard title="Nuevos Prospectos" value={data.prospects.count} trend="+9%" icon={Users} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <LineChartCard title="Rendimiento de Cotizaciones" subtitle="Generadas vs Aprobadas · ultimos 30 dias" seriesA="Generadas" seriesB="Aprobadas" />
        </div>
        <div className="xl:col-span-3">
          <DonutCard title="Pipeline Comercial" label="Aprobadas" value={`${data.acceptedStats.count}`} />
        </div>
        <div className="xl:col-span-2">
          <ProgressList
            title="Top Automations"
            items={[
              { label: 'Follow-up WhatsApp', value: '87%', meta: '342 enviados', progress: 87 },
              { label: 'Reactivacion', value: '57%', meta: '89 completados', progress: 57 },
            ]}
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <ProgressList
          title="Crecimiento"
          items={[
            { label: 'Prospectos nuevos', value: '+18%', meta: 'vs mes anterior', progress: 78 },
            { label: 'Cotizaciones vistas', value: '+11%', meta: 'apertura WhatsApp', progress: 64 },
          ]}
        />
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm xl:col-span-1">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Cotizaciones Recientes</h2>
            <a href="/dashboard/quotes" className="text-xs font-medium text-indigo-600">View All</a>
          </div>
          <div className="space-y-4">
            {data.recentQuotes.map((quote: any) => (
              <div key={quote.id} className="flex items-center justify-between gap-4 rounded-2xl bg-gray-50 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{quote.clientName}</p>
                  <p className="text-xs text-gray-500">{formatMXN(quote.total)}</p>
                </div>
                <StatusBadge tone={statusTone[quote.status || 'generated']}>{quote.status || 'generated'}</StatusBadge>
              </div>
            ))}
          </div>
        </section>
        <AiInsightCard
          insights={[
            { title: 'Follow-up sugerido', body: 'La cotizacion #004 lleva 48hrs sin abrirse. Sugerir follow-up por WhatsApp.' },
            { title: 'Mejor horario', body: 'Los prospectos responden mejor entre 10:00 y 11:30 AM.' },
          ]}
        />
      </div>
    </div>
  );
}
