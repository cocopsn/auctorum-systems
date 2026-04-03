'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Download, MessageCircle, User, Building2, Mail, Phone } from 'lucide-react';

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
        body: JSON.stringify({ ...form, items, tenantSlug }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al generar cotización');
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

  const inputClass =
    'w-full rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] focus:outline-none transition-colors';

  const labelClass = 'flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] mb-1.5';

  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 animate-fade-in">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--success)]/10">
          <CheckCircle2 className="h-8 w-8 text-[var(--success)]" />
        </div>
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
          Cotización generada
        </h2>
        <p className="text-[var(--text-secondary)] text-sm mb-8">
          Cotización <span className="font-mono font-semibold text-[var(--text-primary)]">#{success.quoteNumber}</span> enviada a su WhatsApp y correo.
        </p>
        <a
          href={success.pdfUrl}
          target="_blank"
          className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-white font-medium text-sm bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors"
        >
          <Download className="h-4 w-4" />
          Descargar PDF
        </a>
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-[var(--text-tertiary)]">
          <MessageCircle className="h-3.5 w-3.5" />
          <p>Si tiene preguntas, contáctenos directamente por WhatsApp.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">
          Datos para su cotización
        </h2>
        <p className="mt-2 text-[var(--text-secondary)] text-sm">
          Complete sus datos y recibirá la cotización formal al instante.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="clientName" className={labelClass}>
            <User className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
            Nombre completo <span className="text-[var(--error)]">*</span>
          </label>
          <input
            id="clientName"
            type="text"
            required
            value={form.clientName}
            onChange={e => setForm(prev => ({ ...prev, clientName: e.target.value }))}
            className={inputClass}
            placeholder="Ing. Juan Pérez"
          />
        </div>

        <div>
          <label htmlFor="clientCompany" className={labelClass}>
            <Building2 className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
            Empresa <span className="text-[var(--error)]">*</span>
          </label>
          <input
            id="clientCompany"
            type="text"
            required
            value={form.clientCompany}
            onChange={e => setForm(prev => ({ ...prev, clientCompany: e.target.value }))}
            className={inputClass}
            placeholder="Magna International"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="clientEmail" className={labelClass}>
              <Mail className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
              Correo electrónico
            </label>
            <input
              id="clientEmail"
              type="email"
              value={form.clientEmail}
              onChange={e => setForm(prev => ({ ...prev, clientEmail: e.target.value }))}
              className={inputClass}
              placeholder="jperez@magna.com"
            />
          </div>
          <div>
            <label htmlFor="clientPhone" className={labelClass}>
              <Phone className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
              Teléfono / WhatsApp <span className="text-[var(--error)]">*</span>
            </label>
            <input
              id="clientPhone"
              type="tel"
              required
              value={form.clientPhone}
              onChange={e => setForm(prev => ({ ...prev, clientPhone: e.target.value }))}
              className={inputClass}
              placeholder="844 123 4567"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-lg bg-[var(--error)]/10 border border-[var(--error)]/20 p-3 text-sm text-[var(--error)]">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="pt-2">
          <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] mb-4">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-[var(--accent-muted)] text-[10px] font-mono font-bold text-[var(--accent)]">
              {items.length}
            </span>
            <span>producto{items.length !== 1 ? 's' : ''} seleccionado{items.length !== 1 ? 's' : ''}</span>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg py-2.5 text-white font-medium text-sm bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generando cotización...
              </span>
            ) : (
              'Generar cotización en PDF'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
