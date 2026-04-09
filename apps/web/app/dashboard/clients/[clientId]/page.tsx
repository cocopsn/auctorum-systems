import { db, clients, quotes } from '@quote-engine/db';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { notFound } from 'next/navigation';
import ClientDetailClient from '@/components/dashboard/ClientDetailClient';
import type { TenantConfig } from '@quote-engine/db';

export const dynamic = 'force-dynamic';

// ============================================================
// Client detail page — server component.
// Resolves the client via requireAuth() tenant scoping and joins
// related quotes by normalized phone (there is no quotes.clientId
// FK; clients.phone is stored digits-only, quotes.clientPhone is
// raw portal input, so we regexp_replace at query time).
// ============================================================

export default async function ClientDetailPage({
  params,
}: {
  params: { clientId: string };
}) {
  const { tenant } = await requireAuth();

  const [client] = await db
    .select()
    .from(clients)
    .where(and(
      eq(clients.id, params.clientId),
      eq(clients.tenantId, tenant.id),
      isNull(clients.deletedAt),
    ))
    .limit(1);

  if (!client) notFound();

  const relatedQuotes = client.phone
    ? await db
        .select({
          id: quotes.id,
          quoteNumber: quotes.quoteNumber,
          tenantSeq: quotes.tenantSeq,
          status: quotes.status,
          total: quotes.total,
          createdAt: quotes.createdAt,
        })
        .from(quotes)
        .where(and(
          eq(quotes.tenantId, tenant.id),
          sql`regexp_replace(${quotes.clientPhone}, '\D', '', 'g') = ${client.phone}`,
        ))
        .orderBy(desc(quotes.createdAt))
        .limit(50)
    : [];

  const config = tenant.config as TenantConfig;
  const folioPrefix = config?.quote_settings?.auto_number_prefix?.trim() || 'COT';

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <ClientDetailClient
        client={client}
        quotes={relatedQuotes}
        folioPrefix={folioPrefix}
      />
    </div>
  );
}
