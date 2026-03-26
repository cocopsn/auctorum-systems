import { db, clients, tenants, type Client } from '@quote-engine/db';
import { eq, desc } from 'drizzle-orm';
import { getTenant } from '@/lib/tenant';
import { MOCK_TENANT } from '@/lib/mock-data';

export const dynamic = 'force-dynamic';

const MOCK_CLIENTS = [
  { id: '1', name: 'Juan Perez', email: 'juan@magna.com', phone: '8441234567', company: 'Magna International', totalQuotes: 5, totalQuotedAmount: '45000.00', totalAccepted: 3, totalAcceptedAmount: '32000.00', lastQuoteAt: new Date(Date.now() - 2 * 86400000), tenantId: '1', createdAt: new Date(), updatedAt: new Date() },
  { id: '2', name: 'Maria Garcia', email: 'maria@lear.com', phone: '8449876543', company: 'Lear Corporation', totalQuotes: 3, totalQuotedAmount: '18500.00', totalAccepted: 1, totalAcceptedAmount: '6496.00', lastQuoteAt: new Date(Date.now() - 86400000), tenantId: '1', createdAt: new Date(), updatedAt: new Date() },
  { id: '3', name: 'Carlos Lopez', email: 'carlos@stellantis.com', phone: '8445551234', company: 'Stellantis', totalQuotes: 8, totalQuotedAmount: '125000.00', totalAccepted: 6, totalAcceptedAmount: '98000.00', lastQuoteAt: new Date(Date.now() - 5 * 86400000), tenantId: '1', createdAt: new Date(), updatedAt: new Date() },
];

function formatMXN(amount: string | number | null) {
  if (amount === null) return '$0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num);
}

function formatDate(date: Date | null) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(date));
}

export default async function ClientsPage() {
  let tenantClients: any[];

  try {
    let tenant = await getTenant();
    if (!tenant) {
      const [first] = await db.select().from(tenants).limit(1);
      tenant = first ?? null;
    }
    if (!tenant) throw new Error('no tenant');

    tenantClients = await db
      .select()
      .from(clients)
      .where(eq(clients.tenantId, tenant.id))
      .orderBy(desc(clients.lastQuoteAt));
  } catch {
    tenantClients = MOCK_CLIENTS;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Directorio construido automáticamente a partir de cotizaciones
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <p className="text-sm text-gray-500">{tenantClients.length} clientes registrados</p>
        </div>

        {tenantClients.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="font-medium">Sin clientes todavía</p>
            <p className="text-xs mt-1">
              Los clientes aparecen aquí automáticamente al recibir cotizaciones
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-500">
                <tr>
                  <th className="text-left px-6 py-3 font-medium">Nombre</th>
                  <th className="text-left px-6 py-3 font-medium hidden md:table-cell">Empresa</th>
                  <th className="text-left px-6 py-3 font-medium hidden lg:table-cell">Teléfono</th>
                  <th className="text-right px-6 py-3 font-medium">Cotizaciones</th>
                  <th className="text-right px-6 py-3 font-medium hidden sm:table-cell">Total cotizado</th>
                  <th className="text-right px-6 py-3 font-medium hidden md:table-cell">Aceptadas</th>
                  <th className="text-right px-6 py-3 font-medium hidden lg:table-cell">Última cotización</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tenantClients.map((client: Client) => {
                  const convRate =
                    client.totalQuotes && client.totalQuotes > 0
                      ? Math.round(((client.totalAccepted ?? 0) / client.totalQuotes) * 100)
                      : 0;

                  return (
                    <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3">
                        <p className="font-medium text-gray-900">{client.name}</p>
                        {client.email && (
                          <p className="text-xs text-gray-400">{client.email}</p>
                        )}
                      </td>
                      <td className="px-6 py-3 text-gray-600 hidden md:table-cell">
                        {client.company || '—'}
                      </td>
                      <td className="px-6 py-3 text-gray-500 hidden lg:table-cell font-mono text-xs">
                        {client.phone || '—'}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <span className="font-semibold text-gray-900">{client.totalQuotes ?? 0}</span>
                      </td>
                      <td className="px-6 py-3 text-right font-semibold tabular-nums hidden sm:table-cell">
                        {formatMXN(client.totalQuotedAmount)}
                      </td>
                      <td className="px-6 py-3 text-right hidden md:table-cell">
                        <span className="font-medium text-green-700">{client.totalAccepted ?? 0}</span>
                        {client.totalQuotes ? (
                          <span className="text-xs text-gray-400 ml-1">({convRate}%)</span>
                        ) : null}
                      </td>
                      <td className="px-6 py-3 text-right text-gray-400 text-xs hidden lg:table-cell">
                        {formatDate(client.lastQuoteAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
