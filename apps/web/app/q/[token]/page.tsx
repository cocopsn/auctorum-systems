import { notFound } from 'next/navigation';
import { db, quotes, quoteItems, quoteEvents, tenants, type QuoteItem } from '@quote-engine/db';
import { eq } from 'drizzle-orm';
import QuoteActions from './QuoteActions';

type PageProps = { params: { token: string } };

function formatMXN(amount: string | number) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num);
}

function formatDate(date: Date | null) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(date));
}

const STATUS_LABELS: Record<string, string> = {
  generated: 'Generada',
  sent: 'Enviada',
  viewed: 'Vista',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  expired: 'Vencida',
};

const STATUS_COLORS: Record<string, string> = {
  generated: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]',
  sent: 'bg-[var(--accent-muted)] text-[var(--accent)]',
  viewed: 'bg-[var(--warning)]/15 text-[var(--warning)]',
  accepted: 'bg-[var(--success)]/15 text-[var(--success)]',
  rejected: 'bg-[var(--error)]/15 text-[var(--error)]',
  expired: 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]',
};

export default async function QuoteTrackingPage({ params }: PageProps) {
  const { token } = params;

  // Look up quote by tracking token
  const [quote] = await db
    .select()
    .from(quotes)
    .where(eq(quotes.trackingToken, token))
    .limit(1);

  if (!quote) {
    notFound();
  }

  // Fetch tenant for branding
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, quote.tenantId))
    .limit(1);

  // Fetch quote items
  const items = await db
    .select()
    .from(quoteItems)
    .where(eq(quoteItems.quoteId, quote.id));

  // Record 'opened' event and update viewedAt if first view
  const isFirstView = !quote.viewedAt;

  await db.insert(quoteEvents).values({
    quoteId: quote.id,
    tenantId: quote.tenantId,
    eventType: 'opened',
    metadata: { token, userAgent: null },
  });

  if (isFirstView) {
    await db
      .update(quotes)
      .set({ viewedAt: new Date(), status: 'viewed' })
      .where(eq(quotes.id, quote.id));
  }

  const config = tenant?.config as Record<string, unknown> | null;
  const primaryColor =
    (config?.colors as Record<string, string> | undefined)?.primary ?? '#1B3A5C';
  const tenantName = tenant?.name ?? 'Cotización';

  const isTerminal = quote.status === 'accepted' || quote.status === 'rejected' || quote.status === 'expired';
  const pdfUrl = `/api/quotes/${quote.id}/pdf`;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div
          className="rounded-2xl text-white px-6 py-6 mb-6"
          style={{ backgroundColor: primaryColor }}
        >
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm opacity-75 font-medium">{tenantName}</p>
              <h1 className="text-2xl font-bold mt-1">
                Cotización #{String(quote.quoteNumber).padStart(4, '0')}
              </h1>
              <p className="text-sm opacity-75 mt-1">{formatDate(quote.createdAt)}</p>
            </div>
            <span className={`self-start px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[quote.status || 'generated']}`}>
              {STATUS_LABELS[quote.status || 'generated']}
            </span>
          </div>
        </div>

        {/* Client info */}
        <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-5 mb-5">
          <h2 className="text-sm font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-3">
            Información del cliente
          </h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <p className="text-[var(--text-tertiary)]">Nombre</p>
              <p className="font-medium text-[var(--text-primary)]">{quote.clientName}</p>
            </div>
            {quote.clientCompany && (
              <div>
                <p className="text-[var(--text-tertiary)]">Empresa</p>
                <p className="font-medium text-[var(--text-primary)]">{quote.clientCompany}</p>
              </div>
            )}
            {quote.clientPhone && (
              <div>
                <p className="text-[var(--text-tertiary)]">Teléfono</p>
                <p className="font-medium text-[var(--text-primary)]">{quote.clientPhone}</p>
              </div>
            )}
            {quote.clientEmail && (
              <div>
                <p className="text-[var(--text-tertiary)]">Correo</p>
                <p className="font-medium text-[var(--text-primary)]">{quote.clientEmail}</p>
              </div>
            )}
          </div>
        </div>

        {/* Items table */}
        <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] mb-5 overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h2 className="font-semibold text-[var(--text-primary)]">Productos cotizados</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-primary)] border-b border-[var(--border)] text-[var(--text-tertiary)]">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Producto</th>
                  <th className="text-right px-5 py-3 font-medium">Cant.</th>
                  <th className="text-right px-5 py-3 font-medium">P. Unit.</th>
                  <th className="text-right px-5 py-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {items.map((item: QuoteItem) => (
                  <tr key={item.id}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-[var(--text-primary)]">{item.productName}</p>
                      {item.productSku && (
                        <p className="text-xs text-[var(--text-tertiary)] font-mono">{item.productSku}</p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right text-[var(--text-secondary)]">
                      {item.quantity} {item.unitType}
                    </td>
                    <td className="px-5 py-3 text-right text-[var(--text-secondary)]">
                      {formatMXN(item.unitPrice)}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums text-[var(--text-primary)]">
                      {formatMXN(item.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="px-5 py-4 bg-[var(--bg-primary)] border-t border-[var(--border)] space-y-1.5">
            <div className="flex justify-between text-sm text-[var(--text-secondary)]">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatMXN(quote.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-[var(--text-secondary)]">
              <span>IVA ({Math.round(parseFloat(quote.taxRate || '0.16') * 100)}%)</span>
              <span className="tabular-nums">{formatMXN(quote.taxAmount)}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-1 border-t border-[var(--border)] text-[var(--text-primary)]">
              <span>Total</span>
              <span className="tabular-nums">{formatMXN(quote.total)}</span>
            </div>
          </div>
        </div>

        {/* Validity */}
        {quote.expiresAt && (
          <div className="bg-[var(--warning)]/10 border border-[var(--warning)]/30 rounded-xl p-4 mb-5 text-sm text-[var(--warning)]">
            <strong>Vigencia:</strong> Esta cotización es válida hasta el{' '}
            {formatDate(quote.expiresAt)}.
          </div>
        )}

        {/* Actions */}
        <div className="no-print">
          <QuoteActions
            quoteId={quote.id}
            token={token}
            pdfUrl={pdfUrl}
            isTerminal={isTerminal}
            currentStatus={quote.status ?? 'sent'}
          />
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[var(--text-tertiary)] mt-8 no-print">
          Powered by Auctorum Systems &middot; auctorum.com.mx
        </p>
      </div>
    </div>
  );
}
