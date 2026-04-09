export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { db, conversations, clients } from '@quote-engine/db';
import { eq, desc } from 'drizzle-orm';
import { getAuthTenant } from '@/lib/auth';
import { MessageCircle, Phone, Bot } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  open: 'Abierta',
  closed: 'Cerrada',
  archived: 'Archivada',
};

const STATUS_TONE: Record<string, string> = {
  open: 'bg-[var(--success)]/10 text-[var(--success)]',
  closed: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]',
  archived: 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]',
};

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  web: 'Web',
  telegram: 'Telegram',
  facebook: 'Facebook',
  instagram: 'Instagram',
  sms: 'SMS',
  phone: 'Llamada',
};

function formatRelative(date: Date | null): string {
  if (!date) return '—';
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(new Date(date));
}

export default async function ConversationsPage() {
  const auth = await getAuthTenant();
  if (!auth) redirect('/login');

  const rows = await db
    .select({
      id: conversations.id,
      status: conversations.status,
      channel: conversations.channel,
      botPaused: conversations.botPaused,
      unreadCount: conversations.unreadCount,
      lastMessageAt: conversations.lastMessageAt,
      createdAt: conversations.createdAt,
      clientId: clients.id,
      clientName: clients.name,
      clientPhone: clients.phone,
      clientCompany: clients.company,
    })
    .from(conversations)
    .leftJoin(clients, eq(conversations.clientId, clients.id))
    .where(eq(conversations.tenantId, auth.tenant.id))
    .orderBy(desc(conversations.lastMessageAt))
    .limit(50);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Conversaciones</h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-0.5">
          Hilos activos con clientes a través de WhatsApp y otros canales
        </p>
      </div>

      <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <p className="text-sm text-[var(--text-tertiary)]">
            {rows.length} conversaci{rows.length === 1 ? 'ón' : 'ones'}
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
              <MessageCircle className="w-7 h-7 text-[var(--text-tertiary)] opacity-40" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              Sin conversaciones todavía
            </h3>
            <p className="text-sm text-[var(--text-tertiary)] mb-6 max-w-sm">
              Cuando un cliente escriba por WhatsApp u otro canal, las conversaciones aparecerán
              aquí.
            </p>
            <a
              href="/dashboard/settings#integrations"
              className="px-4 py-2 bg-[var(--accent)] text-white text-sm rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
            >
              Conectar canal
            </a>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--border)]">
                <tr className="text-[var(--text-tertiary)]">
                  <th className="text-left px-6 py-3 text-[11px] font-mono uppercase tracking-wide">
                    Cliente
                  </th>
                  <th className="text-left px-6 py-3 text-[11px] font-mono uppercase tracking-wide hidden md:table-cell">
                    Canal
                  </th>
                  <th className="text-left px-6 py-3 text-[11px] font-mono uppercase tracking-wide">
                    Estado
                  </th>
                  <th className="text-left px-6 py-3 text-[11px] font-mono uppercase tracking-wide hidden lg:table-cell">
                    Bot
                  </th>
                  <th className="text-right px-6 py-3 text-[11px] font-mono uppercase tracking-wide">
                    Última actividad
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                    <td className="px-6 py-3">
                      <p className="font-medium text-[var(--text-primary)]">
                        {row.clientName ?? 'Cliente sin asignar'}
                      </p>
                      {row.clientPhone && (
                        <p className="text-xs text-[var(--text-tertiary)] font-mono flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" />
                          {row.clientPhone}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-3 text-[var(--text-secondary)] hidden md:table-cell">
                      {CHANNEL_LABELS[row.channel] ?? row.channel}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_TONE[row.status] ?? STATUS_TONE.closed}`}
                      >
                        {STATUS_LABELS[row.status] ?? row.status}
                      </span>
                      {row.unreadCount > 0 && (
                        <span className="ml-2 inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[var(--accent)] text-white">
                          {row.unreadCount}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 hidden lg:table-cell">
                      {row.botPaused ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--warning)]/10 text-[var(--warning)]">
                          <Bot className="w-3 h-3" />
                          Pausado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--accent-muted)] text-[var(--accent)]">
                          <Bot className="w-3 h-3" />
                          Activo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right text-[var(--text-tertiary)] text-xs font-mono">
                      {formatRelative(row.lastMessageAt ?? row.createdAt)}
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
