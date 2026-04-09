import {
  db,
  quotes,
  clients,
  tenants,
  messages,
  conversations,
  botFaqs,
  funnelStages,
  clientFunnel,
} from '@quote-engine/db';
import { and, count, desc, eq, gte, lt, sql } from 'drizzle-orm';
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
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

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

  // WhatsApp open rate: outbound messages with readAt set / total outbound (this month).
  // messages.tenantId doesn't exist directly, so JOIN conversations.
  const [messageStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      delivered: sql<number>`count(*) filter (where ${messages.readAt} is not null)::int`,
      botSent: sql<number>`count(*) filter (where ${messages.senderType} = 'bot')::int`,
    })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(
      and(
        eq(conversations.tenantId, tenantId),
        eq(messages.direction, 'outbound'),
        gte(messages.createdAt, monthStart),
      ),
    );

  // FAQs activas
  const [faqStats] = await db
    .select({ count: count() })
    .from(botFaqs)
    .where(and(eq(botFaqs.tenantId, tenantId), eq(botFaqs.active, true)));

  // Month-over-month growth: quotes and clients
  const [prevQuoteCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(quotes)
    .where(
      and(
        eq(quotes.tenantId, tenantId),
        gte(quotes.createdAt, prevMonthStart),
        lt(quotes.createdAt, monthStart),
      ),
    );

  const [prevClientCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(clients)
    .where(
      and(
        eq(clients.tenantId, tenantId),
        gte(clients.createdAt, prevMonthStart),
        lt(clients.createdAt, monthStart),
      ),
    );

  // Pipeline funnel: % de clientes en stage final vs total tracked
  const stageDistribution = await db
    .select({
      id: funnelStages.id,
      name: funnelStages.name,
      position: funnelStages.position,
      count: sql<number>`count(${clientFunnel.clientId})::int`,
    })
    .from(funnelStages)
    .leftJoin(clientFunnel, eq(clientFunnel.stageId, funnelStages.id))
    .where(eq(funnelStages.tenantId, tenantId))
    .groupBy(funnelStages.id, funnelStages.name, funnelStages.position)
    .orderBy(funnelStages.position);

  return {
    monthStats,
    acceptedStats,
    prospects,
    recentQuotes,
    messageStats,
    faqStats,
    prevQuoteCount,
    prevClientCount,
    stageDistribution,
  };
}

function mockDashboardData() {
  return {
    monthStats: { count: MOCK_QUOTES.length, total: MOCK_QUOTES.reduce((sum, quote) => sum + parseFloat(quote.total), 0) },
    acceptedStats: { count: MOCK_QUOTES.filter((quote) => quote.status === 'accepted').length },
    prospects: { count: 7 },
    recentQuotes: MOCK_QUOTES.slice(0, 5),
    messageStats: { total: 0, delivered: 0, botSent: 0 },
    faqStats: { count: 0 },
    prevQuoteCount: { count: 0 },
    prevClientCount: { count: 0 },
    stageDistribution: [] as Array<{ id: string; name: string; position: number; count: number }>,
  };
}

function pctDelta(current: number, prev: number): number {
  if (prev === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - prev) / prev) * 100);
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

  const openRate = data.messageStats.total > 0
    ? Math.round((data.messageStats.delivered / data.messageStats.total) * 100)
    : 0;
  const botRate = data.messageStats.total > 0
    ? Math.round((data.messageStats.botSent / data.messageStats.total) * 100)
    : 0;
  const faqCount: number = data.faqStats.count ?? 0;
  const faqProgress = Math.min(100, faqCount * 10);

  const quoteGrowth = pctDelta(data.monthStats.count, data.prevQuoteCount.count);
  const clientGrowth = pctDelta(data.prospects.count, data.prevClientCount.count);
  const quoteGrowthAbs = Math.min(100, Math.abs(quoteGrowth));
  const clientGrowthAbs = Math.min(100, Math.abs(clientGrowth));

  // Pipeline donut: % de clientes que llegaron al stage final
  const totalInFunnel = data.stageDistribution.reduce(
    (sum: number, stage: { count: number }) => sum + stage.count,
    0,
  );
  const lastStage = data.stageDistribution[data.stageDistribution.length - 1];
  const pipelineConvRate = totalInFunnel > 0 && lastStage
    ? Math.round((lastStage.count / totalInFunnel) * 100)
    : 0;
  const pipelineLabel = lastStage?.name ?? 'Cerrados';

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
          <DonutCard title="Pipeline Comercial" label={pipelineLabel} value={`${pipelineConvRate}%`} />
        </div>
        <div className="xl:col-span-2">
          <ProgressList
            title="Top Automations"
            items={[
              {
                label: 'Bot autoresponse',
                value: `${botRate}%`,
                meta: `${data.messageStats.botSent} enviados`,
                progress: botRate,
              },
              {
                label: 'FAQs activas',
                value: `${faqCount}`,
                meta: 'respuestas auto',
                progress: faqProgress,
              },
            ]}
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <ProgressList
          title="Crecimiento"
          items={[
            {
              label: 'Cotizaciones',
              value: `${quoteGrowth >= 0 ? '+' : ''}${quoteGrowth}%`,
              meta: 'vs mes anterior',
              progress: quoteGrowthAbs,
            },
            {
              label: 'Prospectos nuevos',
              value: `${clientGrowth >= 0 ? '+' : ''}${clientGrowth}%`,
              meta: 'vs mes anterior',
              progress: clientGrowthAbs,
            },
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
