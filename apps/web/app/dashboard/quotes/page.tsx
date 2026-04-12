'use client';

import { useEffect, useState } from 'react';

type Quote = {
  id: string;
  quoteNumber: number;
  clientName: string;
  clientCompany: string | null;
  total: string;
  status: string;
  createdAt: string;
  pdfUrl: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  generated: 'text-[var(--text-tertiary)] bg-[var(--bg-tertiary)]',
  sent: 'text-[var(--accent)] bg-[var(--accent-muted)]',
  viewed: 'text-[var(--warning)] bg-[var(--warning)]/10',
  accepted: 'text-[var(--success)] bg-[var(--success)]/10',
  rejected: 'text-[var(--error)] bg-[var(--error)]/10',
  expired: 'text-[var(--text-tertiary)] bg-[var(--bg-tertiary)]',
};

const STATUS_LABELS: Record<string, string> = {
  generated: 'Generada',
  sent: 'Enviada',
  viewed: 'Vista',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  expired: 'Vencida',
};

const ALL_STATUSES = ['all', 'generated', 'sent', 'viewed', 'accepted', 'rejected', 'expired'];

function formatMXN(amount: string) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(parseFloat(amount));
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(dateStr));
}

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetch('/api/quotes/list', { credentials: 'include' })
      .then(r => r.json())
      .then(data => { if (data.success) setQuotes(data.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? quotes : quotes.filter(q => q.status === filter);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Cotizaciones</h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-0.5">Historial completo de cotizaciones</p>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 flex-wrap mb-4">
        {ALL_STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === s
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]'
            }`}
          >
            {s === 'all' ? 'Todas' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--border)]">
              <tr className="text-[var(--text-tertiary)]">
                <th className="text-left px-6 py-3 text-[11px] font-mono uppercase tracking-wide">#</th>
                <th className="text-left px-6 py-3 text-[11px] font-mono uppercase tracking-wide">Cliente</th>
                <th className="text-left px-6 py-3 text-[11px] font-mono uppercase tracking-wide hidden md:table-cell">Empresa</th>
                <th className="text-right px-6 py-3 text-[11px] font-mono uppercase tracking-wide">Total</th>
                <th className="text-center px-6 py-3 text-[11px] font-mono uppercase tracking-wide">Estatus</th>
                <th className="text-right px-6 py-3 text-[11px] font-mono uppercase tracking-wide hidden sm:table-cell">Fecha</th>
                <th className="text-center px-6 py-3 text-[11px] font-mono uppercase tracking-wide hidden lg:table-cell">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-[var(--text-tertiary)]">
                    Cargando cotizaciones…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-0">
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-[var(--text-tertiary)] opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                          <path d="M9 12h6M12 9v6M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Sin cotizaciones</h3>
                      <p className="text-sm text-[var(--text-tertiary)] mb-6 max-w-sm">
                        {filter === 'all'
                          ? 'Comparta su portal para empezar a recibir cotizaciones.'
                          : `No hay cotizaciones con estatus "${STATUS_LABELS[filter]}".`}
                      </p>
                      {filter === 'all' && (
                        <a href="/dashboard/settings" className="px-4 py-2 bg-[var(--accent)] text-white text-sm rounded-lg hover:bg-[var(--accent-hover)] transition-colors">
                          Configurar portal
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(q => (
                  <tr key={q.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                    <td className="px-6 py-3 font-mono text-[var(--text-tertiary)] text-xs">
                      {String(q.quoteNumber).padStart(4, '0')}
                    </td>
                    <td className="px-6 py-3 font-medium text-[var(--text-primary)]">{q.clientName}</td>
                    <td className="px-6 py-3 text-[var(--text-secondary)] hidden md:table-cell">{q.clientCompany || '-'}</td>
                    <td className="px-6 py-3 text-right font-mono font-medium text-[var(--text-primary)]">{formatMXN(q.total)}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${STATUS_COLORS[q.status || 'generated']}`}>
                        {STATUS_LABELS[q.status || 'generated']}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right text-[var(--text-tertiary)] text-xs hidden sm:table-cell">
                      {formatDate(q.createdAt)}
                    </td>
                    <td className="px-6 py-3 text-center hidden lg:table-cell">
                      <a
                        href={q.pdfUrl || `/api/quotes/${q.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--accent)] border border-[var(--accent)]/30 rounded-lg hover:bg-[var(--accent-muted)] transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Ver PDF
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
