'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import {
  FileText,
  Plus,
  Search,
  ChevronUp,
  DollarSign,
  CheckCircle,
  Clock,
  TrendingUp,
  Trash2,
  Loader2,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Invoice {
  id: string;
  folio: string;
  client_id: string | null;
  patient_id: string | null;
  rfc: string;
  razon_social: string;
  email: string;
  uso_cfdi: string;
  regimen_fiscal: string;
  cp_zip: string;
  subtotal: number;
  iva: number;
  total: number;
  status: string;
  cfdi_xml_url: string | null;
  pdf_url: string | null;
  cfdi_uuid: string | null;
  error_message: string | null;
  stamped_at: string | null;
  created_at: string;
  client_name: string | null;
}

interface KPIs {
  facturadoMonth: number;
  stampedCount: number;
  pendingCount: number;
  totalAllTime: number;
}

interface InvoiceItem {
  description: string;
  amount: number;
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
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    stamped: 'bg-green-50 text-green-700 border-green-200',
    cancelled: 'bg-gray-50 text-gray-600 border-gray-200',
    error: 'bg-red-50 text-red-700 border-red-200',
  };
  return map[status] ?? 'bg-gray-50 text-gray-600 border-gray-200';
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    pending: 'Pendiente',
    stamped: 'Timbrada',
    cancelled: 'Cancelada',
    error: 'Error',
  };
  return map[status] ?? status;
}

// ---------------------------------------------------------------------------
// CFDI options
// ---------------------------------------------------------------------------
const USO_CFDI_OPTIONS = [
  { value: 'G03', label: 'G03 - Gastos en general' },
  { value: 'D01', label: 'D01 - Honorarios medicos, dentales y gastos hospitalarios' },
  { value: 'P01', label: 'P01 - Por definir' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function InvoicesPage() {
  const [invoicesList, setInvoicesList] = useState<Invoice[]>([]);
  const [kpis, setKpis] = useState<KPIs>({
    facturadoMonth: 0,
    stampedCount: 0,
    pendingCount: 0,
    totalAllTime: 0,
  });
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Form
  const [showForm, setShowForm] = useState(false);
  const [formRfc, setFormRfc] = useState('');
  const [formRazonSocial, setFormRazonSocial] = useState('');
  const [formUsoCfdi, setFormUsoCfdi] = useState('G03');
  const [formRegimenFiscal, setFormRegimenFiscal] = useState('');
  const [formCpZip, setFormCpZip] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formClientId, setFormClientId] = useState('');
  const [formItems, setFormItems] = useState<InvoiceItem[]>([{ description: '', amount: 0 }]);
  const [submitting, setSubmitting] = useState(false);

  // ------------------------------------------------------------------
  // Computed totals
  // ------------------------------------------------------------------
  const formSubtotal = formItems.reduce((s, i) => s + (i.amount || 0), 0);
  const formIva = Math.round(formSubtotal * 0.16 * 100) / 100;
  const formTotal = Math.round((formSubtotal + formIva) * 100) / 100;

  // ------------------------------------------------------------------
  // Fetch invoices
  // ------------------------------------------------------------------
  const fetchInvoices = useCallback(async () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (filterStatus) params.set('status', filterStatus);
    const qs = params.toString();

    const res = await fetch(`/api/dashboard/invoices${qs ? `?${qs}` : ''}`);
    if (res.ok) {
      const data = await res.json();
      setInvoicesList(data.invoices);
      setKpis(data.kpis);
    }
    setLoading(false);
  }, [searchQuery, filterStatus]);

  const fetchClients = useCallback(async () => {
    const res = await fetch('/api/dashboard/funnel');
    if (res.ok) {
      const data = await res.json();
      setClients(data.clients ?? []);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
    fetchClients();
  }, [fetchInvoices, fetchClients]);

  // ------------------------------------------------------------------
  // Create invoice
  // ------------------------------------------------------------------
  async function handleCreate() {
    if (!formRfc || !formRazonSocial || !formEmail || !formRegimenFiscal || !formCpZip) return;
    const validItems = formItems.filter((i) => i.description && i.amount > 0);
    if (validItems.length === 0) return;

    setSubmitting(true);
    const body: Record<string, unknown> = {
      rfc: formRfc,
      razonSocial: formRazonSocial,
      usoCfdi: formUsoCfdi,
      regimenFiscal: formRegimenFiscal,
      cpZip: formCpZip,
      email: formEmail,
      items: validItems,
    };
    if (formClientId) body.clientId = formClientId;

    const res = await fetch('/api/dashboard/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setFormRfc('');
      setFormRazonSocial('');
      setFormUsoCfdi('G03');
      setFormRegimenFiscal('');
      setFormCpZip('');
      setFormEmail('');
      setFormClientId('');
      setFormItems([{ description: '', amount: 0 }]);
      setShowForm(false);
      fetchInvoices();
    }
    setSubmitting(false);
  }

  // ------------------------------------------------------------------
  // Items helpers
  // ------------------------------------------------------------------
  function updateItem(index: number, field: keyof InvoiceItem, value: string | number) {
    setFormItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  function addItem() {
    setFormItems((prev) => [...prev, { description: '', amount: 0 }]);
  }

  function removeItem(index: number) {
    setFormItems((prev) => prev.filter((_, i) => i !== index));
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Facturacion</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nueva Factura
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-100 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-50 p-2">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Facturado este mes</p>
              <p className="text-xl font-semibold text-gray-900">{fmtMXN(kpis.facturadoMonth)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-50 p-2">
              <CheckCircle className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Timbradas</p>
              <p className="text-xl font-semibold text-gray-900">{kpis.stampedCount}</p>
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
        <div className="rounded-xl border border-gray-100 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-50 p-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total facturado</p>
              <p className="text-xl font-semibold text-gray-900">{fmtMXN(kpis.totalAllTime)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="rounded-xl border border-gray-100 bg-white p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Nueva Factura</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <ChevronUp className="h-5 w-5" />
            </button>
          </div>

          {/* Datos fiscales */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RFC</label>
              <input
                type="text"
                value={formRfc}
                onChange={(e) => setFormRfc(e.target.value.toUpperCase())}
                maxLength={13}
                placeholder="XAXX010101000"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm uppercase focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Razon Social</label>
              <input
                type="text"
                value={formRazonSocial}
                onChange={(e) => setFormRazonSocial(e.target.value)}
                placeholder="Nombre o razon social"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Uso CFDI</label>
              <select
                value={formUsoCfdi}
                onChange={(e) => setFormUsoCfdi(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                {USO_CFDI_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Regimen Fiscal</label>
              <input
                type="text"
                value={formRegimenFiscal}
                onChange={(e) => setFormRegimenFiscal(e.target.value)}
                placeholder="601, 612, 616..."
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Codigo Postal</label>
              <input
                type="text"
                value={formCpZip}
                onChange={(e) => setFormCpZip(e.target.value)}
                maxLength={5}
                placeholder="64000"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente (opcional)</label>
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
          </div>

          {/* Conceptos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Conceptos</label>
              <button
                type="button"
                onClick={addItem}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                + Agregar concepto
              </button>
            </div>
            <div className="space-y-2">
              {formItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(idx, 'description', e.target.value)}
                    placeholder="Descripcion del concepto"
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.amount || ''}
                    onChange={(e) => updateItem(idx, 'amount', Number(e.target.value))}
                    placeholder="Monto"
                    className="w-32 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                  {formItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium text-gray-900">{fmtMXN(formSubtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">IVA (16%)</span>
                <span className="font-medium text-gray-900">{fmtMXN(formIva)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-1">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-semibold text-gray-900">{fmtMXN(formTotal)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleCreate}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                'Crear Factura'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl border border-gray-100 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por RFC, razon social, folio o email..."
              className="w-full rounded-lg border border-gray-200 pl-10 pr-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">Todos los estados</option>
              <option value="pending">Pendiente</option>
              <option value="stamped">Timbrada</option>
              <option value="cancelled">Cancelada</option>
              <option value="error">Error</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-400">Cargando facturas...</div>
        ) : invoicesList.length === 0 ? (
          <div className="p-10 text-center">
            <FileText className="mx-auto h-10 w-10 text-gray-300 mb-3" />
            <p className="text-gray-400">Cuando los clientes pidan factura, apareceran aqui.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Folio</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">RFC</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Razon Social</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Total</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Fecha</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoicesList.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-indigo-600 font-medium">{inv.folio}</td>
                    <td className="px-4 py-3 font-mono text-gray-700">{inv.rfc}</td>
                    <td className="px-4 py-3 text-gray-900">{inv.razon_social}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-900">
                      {fmtMXN(inv.total)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadge(inv.status)}`}
                      >
                        {statusLabel(inv.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {new Date(inv.created_at).toLocaleDateString('es-MX')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {inv.pdf_url && (
                          <a
                            href={inv.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg p-1.5 text-indigo-600 hover:bg-indigo-50 transition-colors text-xs font-medium"
                          >
                            PDF
                          </a>
                        )}
                        {inv.cfdi_xml_url && (
                          <a
                            href={inv.cfdi_xml_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg p-1.5 text-indigo-600 hover:bg-indigo-50 transition-colors text-xs font-medium"
                          >
                            XML
                          </a>
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
