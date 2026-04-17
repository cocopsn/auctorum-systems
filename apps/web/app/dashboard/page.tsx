import { db, quotes, clients } from "@quote-engine/db";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import DashboardClient from "./DashboardClient";
import { getAuthTenant } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let tenantName = "Auctorum Systems";
  let monthCount = 0;
  let monthTotal = 0;
  let acceptedCount = 0;
  let prospectsCount = 0;
  let recentQuotes: any[] = [];

  try {
    const auth = await getAuthTenant();
    const tenant = auth?.tenant ?? null;
    if (tenant) {
      tenantName = tenant.name;
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const [ms] = await db.select({ count: sql<number>`count(*)::int`, total: sql<number>`coalesce(sum(total::numeric), 0)` }).from(quotes).where(and(eq(quotes.tenantId, tenant.id), gte(quotes.createdAt, monthStart)));
      const [as2] = await db.select({ count: sql<number>`count(*)::int` }).from(quotes).where(and(eq(quotes.tenantId, tenant.id), eq(quotes.status, "accepted"), gte(quotes.createdAt, monthStart)));
      const [ps] = await db.select({ count: sql<number>`count(*)::int` }).from(clients).where(and(eq(clients.tenantId, tenant.id), gte(clients.createdAt, monthStart)));
      monthCount = ms?.count ?? 0;
      monthTotal = ms?.total ?? 0;
      acceptedCount = as2?.count ?? 0;
      prospectsCount = ps?.count ?? 0;
      const rq = await db.select().from(quotes).where(eq(quotes.tenantId, tenant.id)).orderBy(desc(quotes.createdAt)).limit(5);
      recentQuotes = rq.map(q => ({ id: q.id, quoteNumber: q.quoteNumber, clientName: q.clientName, total: q.total, status: q.status, createdAt: q.createdAt?.toISOString() ?? "" }));
    }
  } catch (e) {
    console.error("Dashboard data error:", e);
  }

  return <DashboardClient data={{ tenantName, monthCount, monthTotal, acceptedCount, prospectsCount, recentQuotes }} />;
}
