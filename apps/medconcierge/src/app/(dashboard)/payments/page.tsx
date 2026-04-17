'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import {
  CreditCard,
  Plus,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  RotateCcw,
  DollarSign,
  Hash,
  Clock,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Payment {
  id: string;
  client_id: string | null;
  patient_id: string | null;
  amount: number;
  currency: string;
  method: string;
  processor: string;
  status: string;
  reference: string | null;
  notes: string | null;
  paid_at: string | null;
  created_at: string;
  client_name: string | null;
}

interface KPIs {
  totalCollected: number;
  countThisMonth: number;
  pendingCount: number;
}

interface Client {
  id: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmtMXN(amount: number) {
  return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    completed: 'bg-green-50 text-green-700 border-green-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    failed: 'bg-red-50 text-red-700 border-red-200',
    refunded: 'bg-gray-50 text-gray-600 border-gray-200',
  };
  return map[status] ?? 'bg-gray-50 text-gray-600 border-gray-200';
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    completed: 'Completado',
    pending: 'Pendiente',
    failed: 'Fallido',
    refunded: 'Reembolsado',
  };
  return map[status] ?? status;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [kpis, setKpis] = useState<KPIs>({ totalCollected: 0, countThisMonth: 0, pendingCount: 0 });
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterProcessor, setFilterProcessor] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // New payment form
  const [showForm, setShowForm] = useState(false);
  const [formClientId, setFormClientId] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formMethod, setFormMethod] = useState('efectivo');
  const [formProcessor, setFormProcessor] = useState('manual');
  const [formNotes, setFormNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ------------------------------------------------------------------
  // Fetch payments
  // ------------------------------------------------------------------
  const fetchPayments = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterProcessor) params.set('processor', filterProcessor);
    if (filterStatus) params.set('status', filterStatus);
    if (filterStartDate) params.set('startDate', filterStartDate);
    if (filterEndDate) params.set('endDate', filterEndDate);

    const qs = params.toString();
    const res = await fetch(`/api/dashboard/payments${qs ? `?${qs}` : ''}`);
    if (res.ok) {
      const data = await res.json();
      setPayments(data.payments);
      setKpis(data.kpis);
    }
    setLoading(false);
  }, [filterProcessor, filterStatus, filterStartDate, filterEndDate]);

  // ------------------------------------------------------------------
  // Fetch clients for dropdown
  // ------------------------------------------------------------------
  const fetchClients = useCallback(async () => {
    const res = await fetch('/api/dashboard/funnel');
    if (res.ok) {
      const data = await res.json();
      // funnel endpoint returns clients array
      setClients(data.clients ?? []);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
    fetchClients();
  }, [fetchPayments, fetchClients]);

  // ------------------------------------------------------------------
  // Create payment
  // ------------------------------------------------------------------
  async function handleCreate() {
    if (!formAmount || Number(formAmount) <= 0) return;
    setSubmitting(true);

    const body: Record<string, unknown> = {
      amount: Number(formAmount),
      method: formMethod,
      processor: formProcessor,
      notes: formNotes || undefined,
    };
    if (formClientId) body.clientId = formClientId;

    const res = await fetch('/api/dashboard/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setFormClientId('');
      setFormAmount('');
      setFormMethod('efectivo');
      setFormProcessor('manual');
      setFormNotes('');
      setShowForm(false);
      fetchPayments();
    }
    setSubmitting(false);
  }

  // ------------------------------------------------------------------
  // Update status
  // ------------------------------------------------------------------
  async function updateStatus(id: string, status: string) {
    await fetch(`/api/dashboard/payments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchPayments();
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CreditCard className="h-6 w-6 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Pagos</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Registrar Pago
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-100 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-50 p-2">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total cobrado este mes</p>
              <p className="text-xl font-semibold text-gray-900">{fmtMXN(kpis.totalCollected)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-50 p-2">
              <Hash className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pagos este mes</p>
              <p className="text-xl font-semibold text-gray-900">{kpis.countThisMonth}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-50 p-2">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pendientes</p>
              <p className="text-xl font-semibold text-gray-900">{kpis.pendingCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="rounded-xl border border-gray-100 bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Nuevo Pago</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <ChevronUp className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Client */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
              <select
                value={formClientId}
                onChange={(e) => setFormClientId(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="">Sin cliente</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            {/* Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Metodo</label>
              <select
                value={formMethod}
                onChange={(e) => setFormMethod(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            {/* Processor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Procesador</label>
              <select
                value={formProcessor}
                onChange={(e) => setFormProcessor(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="manual">Manual</option>
                <option value="mercadopago">MercadoPago</option>
                <option value="stripe">Stripe</option>
              </select>
            </div>

            {/* Notes */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={2}
                placeholder="Notas opcionales..."
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleCreate}
              disabled={submitting || !formAmount || Number(formAmount) <= 0}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Guardando...' : 'Guardar Pago'}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl border border-gray-100 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Procesador</label>
            <select
              value={filterProcessor}
              onChange={(e) => setFilterProcessor(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">Todos</option>
              <option value="manual">Manual</option>
              <option value="mercadopago">MercadoPago</option>
              <option value="stripe">Stripe</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">Todos</option>
              <option value="pending">Pendiente</option>
              <option value="completed">Completado</option>
              <option value="failed">Fallido</option>
              <option value="refunded">Reembolsado</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-400">Cargando pagos...</div>
        ) : payments.length === 0 ? (
          <div className="p-10 text-center text-gray-400">No se encontraron pagos.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Fecha</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Cliente</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Monto</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Metodo</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Procesador</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Referencia</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-gray-700">
                      {new Date(p.created_at).toLocaleDateString('es-MX')}
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {p.client_name ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-900">{fmtMXN(p.amount)}</td>
                    <td className="px-4 py-3 text-gray-700 capitalize">{p.method}</td>
                    <td className="px-4 py-3 text-gray-700 capitalize">{p.processor}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadge(p.status)}`}
                      >
                        {statusLabel(p.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">
                      {p.reference ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {p.status === 'pending' && (
                          <button
                            onClick={() => updateStatus(p.id, 'completed')}
                            title="Marcar como completado"
                            className="rounded-lg p-1.5 text-green-600 hover:bg-green-50 transition-colors"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        {p.status === 'completed' && (
                          <button
                            onClick={() => updateStatus(p.id, 'refunded')}
                            title="Reembolsar"
                            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 transition-colors"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
