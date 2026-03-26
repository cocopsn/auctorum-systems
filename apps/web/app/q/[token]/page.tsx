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
  generated: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  expired: 'bg-gray-100 text-gray-500',
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
    <div className="min-h-screen bg-gray-50 py-8 px-4">
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
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Información del cliente
          </h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <p className="text-gray-400">Nombre</p>
              <p className="font-medium text-gray-900">{quote.clientName}</p>
            </div>
            {quote.clientCompany && (
              <div>
                <p className="text-gray-400">Empresa</p>
                <p className="font-medium text-gray-900">{quote.clientCompany}</p>
              </div>
            )}
            {quote.clientPhone && (
              <div>
                <p className="text-gray-400">Teléfono</p>
                <p className="font-medium text-gray-900">{quote.clientPhone}</p>
              </div>
            )}
            {quote.clientEmail && (
              <div>
                <p className="text-gray-400">Correo</p>
                <p className="font-medium text-gray-900">{quote.clientEmail}</p>
              </div>
            )}
          </div>
        </div>

        {/* Items table */}
        <div className="bg-white rounded-xl border border-gray-200 mb-5 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Productos cotizados</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-500">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Producto</th>
                  <th className="text-right px-5 py-3 font-medium">Cant.</th>
                  <th className="text-right px-5 py-3 font-medium">P. Unit.</th>
                  <th className="text-right px-5 py-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item: QuoteItem) => (
                  <tr key={item.id}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{item.productName}</p>
                      {item.productSku && (
                        <p className="text-xs text-gray-400 font-mono">{item.productSku}</p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-600">
                      {item.quantity} {item.unitType}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-600">
                      {formatMXN(item.unitPrice)}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums">
                      {formatMXN(item.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatMXN(quote.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>IVA ({Math.round(parseFloat(quote.taxRate || '0.16') * 100)}%)</span>
              <span className="tabular-nums">{formatMXN(quote.taxAmount)}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-1 border-t border-gray-200">
              <span>Total</span>
              <span className="tabular-nums">{formatMXN(quote.total)}</span>
            </div>
          </div>
        </div>

        {/* Validity */}
        {quote.expiresAt && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-5 text-sm text-yellow-800">
            <strong>Vigencia:</strong> Esta cotización es válida hasta el{' '}
            {formatDate(quote.expiresAt)}.
          </div>
        )}

        {/* Actions */}
        <QuoteActions
          quoteId={quote.id}
          token={token}
          pdfUrl={pdfUrl}
          isTerminal={isTerminal}
          currentStatus={quote.status ?? 'sent'}
        />

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-8">
          Powered by Auctorum Systems &middot; auctorum.com.mx
        </p>
      </div>
    </div>
  );
}
