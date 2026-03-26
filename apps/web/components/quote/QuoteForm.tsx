'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

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
        throw new Error(data.error || 'Error al generar cotización');
      }

      const data = await res.json();
      setSuccess({ pdfUrl: data.pdfUrl, quoteNumber: data.quoteNumber });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ backgroundColor: 'var(--tenant-primary)', color: 'white' }}>
          <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Cotización generada</h2>
        <p className="text-gray-500 mb-6">
          Cotización #{success.quoteNumber} enviada a su WhatsApp y correo.
        </p>
        <a
          href={success.pdfUrl}
          target="_blank"
          className="inline-block rounded-lg px-6 py-3 text-white font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--tenant-primary)' }}
        >
          Descargar PDF
        </a>
        <p className="mt-4 text-sm text-gray-400">
          Si tiene preguntas, contáctenos directamente por WhatsApp.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Datos para su cotización</h2>
      <p className="text-gray-500 mb-6">
        Complete sus datos y recibirá la cotización formal al instante por WhatsApp y correo.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre completo *
          </label>
          <input
            type="text"
            required
            value={form.clientName}
            onChange={e => setForm(prev => ({ ...prev, clientName: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Ing. Juan Pérez"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Empresa *
          </label>
          <input
            type="text"
            required
            value={form.clientCompany}
            onChange={e => setForm(prev => ({ ...prev, clientCompany: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Magna International"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              value={form.clientEmail}
              onChange={e => setForm(prev => ({ ...prev, clientEmail: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="jperez@magna.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono / WhatsApp *
            </label>
            <input
              type="tel"
              required
              value={form.clientPhone}
              onChange={e => setForm(prev => ({ ...prev, clientPhone: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="844 123 4567"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="pt-4">
          <p className="text-xs text-gray-400 mb-3">
            {items.length} producto{items.length !== 1 ? 's' : ''} seleccionado{items.length !== 1 ? 's' : ''}
          </p>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg px-6 py-3 text-white font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: 'var(--tenant-secondary)' }}
          >
            {loading ? 'Generando cotización...' : 'Generar cotización en PDF'}
          </button>
        </div>
      </form>
    </div>
  );
}
