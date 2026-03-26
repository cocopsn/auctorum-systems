'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Download, MessageCircle, User, Building2, Mail, Phone } from 'lucide-react';

// ============================================================
// Quote form: the client fills their data → submits → PDF generated
// URL: toolroom.cotizarapido.mx/quote?items=[...]
// ============================================================

interface QuoteFormProps {
  tenantSlug: string;
}

export default function QuoteForm({ tenantSlug }: QuoteFormProps) {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ pdfUrl: string; quoteNumber: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    clientCompany: '',
  });

  const items = (() => {
    try {
      return JSON.parse(searchParams.get('items') || '[]') as Array<{ id: string; qty: number }>;
    } catch {
      return [];
    }
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          items,
          tenantSlug,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al generar cotizacion');
      }

      const data = await res.json();
      const result = data.data || data;
      setSuccess({ pdfUrl: result.pdfUrl, quoteNumber: result.quoteNumber });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 animate-scale-in">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-50 ring-8 ring-green-50/50 animate-check-bounce">
          <CheckCircle2 className="h-10 w-10 text-green-500" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">Cotizacion generada</h2>
        <p className="text-gray-500 text-base mb-8 max-w-sm mx-auto">
          Cotizacion <span className="font-semibold text-gray-700">#{success.quoteNumber}</span> enviada a su WhatsApp y correo.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href={success.pdfUrl}
            target="_blank"
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-white font-bold shadow-lg shadow-tenant-primary/25 bg-tenant-primary transition-all duration-200 hover:shadow-xl hover:shadow-tenant-primary/30 hover:brightness-110 active:scale-[0.97]"
          >
            <Download className="h-4 w-4" />
            Descargar PDF
          </a>
        </div>
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-gray-400">
          <MessageCircle className="h-4 w-4" />
          <p>Si tiene preguntas, contactenos directamente por WhatsApp.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Datos para su cotizacion</h2>
        <p className="mt-2 text-gray-500 text-base">
          Complete sus datos y recibira la cotizacion formal al instante por WhatsApp y correo.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="clientName" className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <User className="h-3.5 w-3.5 text-gray-400" />
            Nombre completo <span className="text-red-400">*</span>
          </label>
          <input
            id="clientName"
            type="text"
            required
            value={form.clientName}
            onChange={e => setForm(prev => ({ ...prev, clientName: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition-all duration-200 focus:border-tenant-primary focus:ring-2 focus:ring-tenant-primary/20 focus:outline-none hover:border-gray-300"
            placeholder="Ing. Juan Perez"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="clientCompany" className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <Building2 className="h-3.5 w-3.5 text-gray-400" />
            Empresa <span className="text-red-400">*</span>
          </label>
          <input
            id="clientCompany"
            type="text"
            required
            value={form.clientCompany}
            onChange={e => setForm(prev => ({ ...prev, clientCompany: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition-all duration-200 focus:border-tenant-primary focus:ring-2 focus:ring-tenant-primary/20 focus:outline-none hover:border-gray-300"
            placeholder="Magna International"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label htmlFor="clientEmail" className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <Mail className="h-3.5 w-3.5 text-gray-400" />
              Correo electronico
            </label>
            <input
              id="clientEmail"
              type="email"
              value={form.clientEmail}
              onChange={e => setForm(prev => ({ ...prev, clientEmail: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition-all duration-200 focus:border-tenant-primary focus:ring-2 focus:ring-tenant-primary/20 focus:outline-none hover:border-gray-300"
              placeholder="jperez@magna.com"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="clientPhone" className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <Phone className="h-3.5 w-3.5 text-gray-400" />
              Telefono / WhatsApp <span className="text-red-400">*</span>
            </label>
            <input
              id="clientPhone"
              type="tel"
              required
              value={form.clientPhone}
              onChange={e => setForm(prev => ({ ...prev, clientPhone: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition-all duration-200 focus:border-tenant-primary focus:ring-2 focus:ring-tenant-primary/20 focus:outline-none hover:border-gray-300"
              placeholder="844 123 4567"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-lg bg-red-50 border border-red-100 p-4 text-sm text-red-700 animate-scale-in">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <div className="pt-4">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-tenant-primary/10">
              <span className="text-[10px] font-bold text-tenant-primary">{items.length}</span>
            </div>
            <span>producto{items.length !== 1 ? 's' : ''} seleccionado{items.length !== 1 ? 's' : ''}</span>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-3.5 text-white font-bold text-sm bg-tenant-secondary shadow-lg shadow-tenant-secondary/25 transition-all duration-200 hover:shadow-xl hover:shadow-tenant-secondary/30 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generando cotizacion...
              </span>
            ) : (
              'Generar cotizacion en PDF'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
