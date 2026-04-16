'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import type { Client } from '@quote-engine/db';

// ============================================================
// Client detail — header, stats, status selector, notes textarea
// (debounced save), and the quote-history table. PATCHes
// /api/clients/[clientId] for notes/status updates.
// ============================================================

type QuoteRow = {
  id: string;
  quoteNumber: number;
  tenantSeq: number | null;
  status: string | null;
  total: string;
  createdAt: Date | null;
};

type ClientStatus = 'lead' | 'customer' | 'inactive';

type Props = {
  client: Client;
  quotes: QuoteRow[];
  folioPrefix: string;
};

const STATUS_LABELS: Record<ClientStatus, string> = {
  lead: 'Lead',
  customer: 'Cliente',
  inactive: 'Inactivo',
};

const STATUS_COLORS: Record<ClientStatus, string> = {
  lead: 'bg-[var(--accent-muted)] text-[var(--accent)]',
  customer: 'bg-[var(--success)]/10 text-[var(--success)]',
  inactive: 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]',
};

const QUOTE_STATUS_LABELS: Record<string, string> = {
  generated: 'Generada',
  sent: 'Enviada',
  viewed: 'Abierta',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  expired: 'Vencida',
};

function formatMXN(amount: string | number | null) {
  if (amount === null || amount === undefined) return '$0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num);
}

function formatDate(date: Date | null) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

function isClientStatus(value: unknown): value is ClientStatus {
  return value === 'lead' || value === 'customer' || value === 'inactive';
}

export default function ClientDetailClient({ client, quotes, folioPrefix }: Props) {
  const initialStatus: ClientStatus = isClientStatus(client.status) ? client.status : 'lead';
  const [status, setStatus] = useState<ClientStatus>(initialStatus);
  const [notes, setNotes] = useState(client.notes || '');
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function patchClient(body: Record<string, unknown>) {
    const res = await fetch(`/api/clients/${client.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('patch failed');
  }

  async function handleStatusChange(next: ClientStatus) {
    if (next === status) return;
    const prev = status;
    setStatus(next);
    setSavingStatus(true);
    try {
      await patchClient({ status: next });
    } catch {
      setStatus(prev);
    } finally {
      setSavingStatus(false);
    }
  }

  function handleNotesChange(value: string) {
    setNotes(value);
    setNotesSaved(false);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(async () => {
      setSavingNotes(true);
      try {
        await patchClient({ notes: value || null });
        setNotesSaved(true);
        setTimeout(() => setNotesSaved(false), 2000);
      } catch {
        /* swallowed — no retry */
      } finally {
        setSavingNotes(false);
      }
    }, 800);
  }

  useEffect(() => () => {
    if (notesTimer.current) clearTimeout(notesTimer.current);
  }, []);

  const conv =
    (client.totalQuotes ?? 0) > 0
      ? Math.round(((client.totalAccepted ?? 0) / (client.totalQuotes || 1)) * 100)
      : 0;

  return (
    <>
      <Link
        href="/dashboard/clients"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] mb-4"
      >
        ← Clientes
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] truncate">
            {client.name}
          </h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-1 truncate">
            {client.company || '—'} · {client.phone || '—'}
            {client.email && ` · ${client.email}`}
          </p>
        </div>
        <span
          className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[status]}`}
        >
          {STATUS_LABELS[status]}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat label="Cotizaciones" value={String(client.totalQuotes ?? 0)} />
        <Stat label="Total cotizado" value={formatMXN(client.totalQuotedAmount)} />
        <Stat label="Aceptadas" value={`${client.totalAccepted ?? 0} (${conv}%)`} />
        <Stat label="Última cotización" value={formatDate(client.lastQuoteAt)} />
      </div>

      {/* Status selector */}
      <Section title="Estado">
        <div className="flex flex-wrap gap-2 items-center">
          {(['lead', 'customer', 'inactive'] as const).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => handleStatusChange(s)}
              disabled={savingStatus}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 ${
                status === s
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
          {savingStatus && (
            <span className="ml-1 text-xs text-[var(--text-tertiary)]">Guardando…</span>
          )}
        </div>
      </Section>

      {/* Notes */}
      <Section
        title="Notas"
        hint={savingNotes ? 'Guardando…' : notesSaved ? 'Guardado' : undefined}
      >
        <textarea
          value={notes}
          onChange={e => handleNotesChange(e.target.value)}
          rows={5}
          maxLength={2000}
          placeholder="Notas internas sobre este cliente (no visibles para él)."
          className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 resize-none"
        />
        <p className="text-xs text-[var(--text-tertiary)] mt-1">{notes.length}/2000</p>
      </Section>

      {/* Quote history */}
      <Section title={`Historial de cotizaciones (${quotes.length})`}>
        {quotes.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)]">Sin cotizaciones registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--border)]">
                <tr className="text-[var(--text-tertiary)] text-[11px] font-mono uppercase tracking-wide">
                  <th className="text-left px-3 py-2">Folio</th>
                  <th className="text-left px-3 py-2">Fecha</th>
                  <th className="text-left px-3 py-2">Estado</th>
                  <th className="text-right px-3 py-2">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {quotes.map(q => {
                  const folio = `${folioPrefix}-${String(q.tenantSeq ?? q.quoteNumber ?? 0).padStart(4, '0')}`;
                  return (
                    <tr key={q.id}>
                      <td className="px-3 py-2 font-mono text-[var(--text-primary)]">{folio}</td>
                      <td className="px-3 py-2 text-[var(--text-tertiary)]">{formatDate(q.createdAt)}</td>
                      <td className="px-3 py-2 text-[var(--text-secondary)]">
                        {q.status ? QUOTE_STATUS_LABELS[q.status] || q.status : '—'}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-[var(--text-primary)]">
                        {formatMXN(q.total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-4">
      <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wide">{label}</p>
      <p className="text-lg font-semibold text-[var(--text-primary)] mt-1">{value}</p>
    </div>
  );
}

function Section({
  title,
  children,
  hint,
}: {
  title: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6 mb-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
        {hint && <span className="text-xs text-[var(--text-tertiary)]">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
