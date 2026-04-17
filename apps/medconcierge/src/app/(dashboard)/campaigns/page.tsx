'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import {
  Megaphone,
  Plus,
  Send,
  Pencil,
  Trash2,
  Loader2,
  BarChart3,
  CheckCircle2,
  Clock,
  MessageSquare,
  X,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Campaign {
  id: string;
  tenant_id: string;
  name: string;
  template_id: string | null;
  audience_filter: Record<string, unknown> | null;
  status: string;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  stats_json: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  message_body: string | null;
  total_recipients: number | null;
  messages_sent: number | null;
  messages_failed: number | null;
}

interface KPIs {
  total_campaigns: number;
  completed: number;
  in_progress: number;
  total_messages_sent: number;
}

type TabKey = 'all' | 'draft' | 'scheduled' | 'completed' | 'cancelled';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'draft', label: 'Borradores' },
  { key: 'scheduled', label: 'Programadas' },
  { key: 'completed', label: 'Completadas' },
  { key: 'cancelled', label: 'Canceladas' },
];

const STATUS_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Borrador' },
  scheduled: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Programada' },
  in_progress: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'En Progreso' },
  completed: { bg: 'bg-green-50', text: 'text-green-700', label: 'Completada' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-700', label: 'Cancelada' },
};

type AudienceType = 'all' | 'funnel_stage' | 'recent_days';

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const badge = STATUS_BADGES[status] ?? STATUS_BADGES.draft;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}
    >
      {badge.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

function KpiCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// New Campaign Form
// ---------------------------------------------------------------------------

function NewCampaignForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [audienceType, setAudienceType] = useState<AudienceType>('all');
  const [funnelStage, setFunnelStage] = useState('lead');
  const [recentDays, setRecentDays] = useState('30');
  const [sendNow, setSendNow] = useState(true);
  const [scheduledAt, setScheduledAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const buildAudienceFilter = (): Record<string, unknown> | undefined => {
    if (audienceType === 'funnel_stage') return { funnelStage };
    if (audienceType === 'recent_days') return { recentDays: Number(recentDays) };
    return undefined;
  };

  const getAudienceLabel = (): string => {
    if (audienceType === 'funnel_stage') return `Etapa: ${funnelStage}`;
    if (audienceType === 'recent_days') return `Ultimos ${recentDays} dias`;
    return 'Todos los clientes';
  };

  const previewMessage = messageBody
    .replace(/\{nombre\}/g, 'Juan Perez')
    .replace(/\{negocio\}/g, 'Mi Negocio');

  const handleSave = async (andSend: boolean) => {
    if (!name.trim() || !messageBody.trim()) return;

    const setter = andSend ? setSending : setSaving;
    setter(true);

    try {
      const res = await fetch('/api/dashboard/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          messageBody,
          audienceFilter: buildAudienceFilter(),
          scheduledAt: !sendNow && scheduledAt ? scheduledAt : undefined,
        }),
      });

      if (!res.ok) throw new Error('Failed to create campaign');

      const data = await res.json();

      if (andSend && data.campaign?.id) {
        await fetch(`/api/dashboard/campaigns/${data.campaign.id}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      }

      onCreated();
    } catch (err) {
      console.error('Error saving campaign:', err);
    } finally {
      setter(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Nueva Campana</h2>
        <button
          onClick={onCancel}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-5">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre de la campana
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Promocion de verano"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            maxLength={255}
          />
        </div>

        {/* Audience */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Audiencia
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="audience"
                checked={audienceType === 'all'}
                onChange={() => setAudienceType('all')}
                className="text-indigo-600 focus:ring-indigo-500"
              />
              Todos los clientes
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="audience"
                checked={audienceType === 'funnel_stage'}
                onChange={() => setAudienceType('funnel_stage')}
                className="text-indigo-600 focus:ring-indigo-500"
              />
              Por etapa del funnel
            </label>
            {audienceType === 'funnel_stage' && (
              <select
                value={funnelStage}
                onChange={(e) => setFunnelStage(e.target.value)}
                className="ml-6 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              >
                <option value="lead">Lead</option>
                <option value="contacted">Contactado</option>
                <option value="qualified">Calificado</option>
                <option value="proposal">Propuesta</option>
                <option value="won">Ganado</option>
                <option value="lost">Perdido</option>
              </select>
            )}
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="audience"
                checked={audienceType === 'recent_days'}
                onChange={() => setAudienceType('recent_days')}
                className="text-indigo-600 focus:ring-indigo-500"
              />
              Ultimos dias
            </label>
            {audienceType === 'recent_days' && (
              <div className="ml-6 flex items-center gap-2">
                {['30', '60', '90'].map((d) => (
                  <button
                    key={d}
                    onClick={() => setRecentDays(d)}
                    className={`rounded-lg px-3 py-1 text-xs font-medium border transition-colors ${
                      recentDays === d
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {d} dias
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Message */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mensaje
          </label>
          <textarea
            value={messageBody}
            onChange={(e) => setMessageBody(e.target.value)}
            placeholder="Hola {nombre}, te escribimos de {negocio} para..."
            rows={4}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
            maxLength={2000}
          />
          <p className="mt-1 text-xs text-gray-400">
            Variables disponibles: {'{nombre}'}, {'{negocio}'}
          </p>
        </div>

        {/* Schedule */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Programacion
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="schedule"
                checked={sendNow}
                onChange={() => setSendNow(true)}
                className="text-indigo-600 focus:ring-indigo-500"
              />
              Enviar ahora
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="schedule"
                checked={!sendNow}
                onChange={() => setSendNow(false)}
                className="text-indigo-600 focus:ring-indigo-500"
              />
              Programar envio
            </label>
            {!sendNow && (
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="ml-6 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            )}
          </div>
        </div>

        {/* Preview */}
        {messageBody.trim() && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vista previa
            </label>
            <div className="rounded-xl bg-gray-100 p-4 max-w-sm">
              <div className="rounded-2xl rounded-tl-sm bg-green-600 px-4 py-3 text-sm text-white shadow-sm whitespace-pre-wrap">
                {previewMessage}
              </div>
              <p className="mt-2 text-xs text-gray-400">
                Audiencia: {getAudienceLabel()}
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => handleSave(false)}
            disabled={saving || sending || !name.trim() || !messageBody.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Guardar como borrador'
            )}
          </button>
          {sendNow && (
            <button
              onClick={() => handleSave(true)}
              disabled={saving || sending || !name.trim() || !messageBody.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Enviar ahora
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [kpis, setKpis] = useState<KPIs>({
    total_campaigns: 0,
    completed: 0,
    in_progress: 0,
    total_messages_sent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [showForm, setShowForm] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/campaigns');
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns ?? []);
        setKpis(
          data.kpis ?? {
            total_campaigns: 0,
            completed: 0,
            in_progress: 0,
            total_messages_sent: 0,
          }
        );
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const filteredCampaigns =
    activeTab === 'all'
      ? campaigns
      : campaigns.filter((c) => c.status === activeTab);

  const getAudienceLabel = (campaign: Campaign): string => {
    const f = campaign.audience_filter;
    if (!f || Object.keys(f).length === 0) return 'Todos';
    if (f.funnelStage) return `Etapa: ${f.funnelStage}`;
    if (f.recentDays) return `Ultimos ${f.recentDays} dias`;
    return 'Personalizado';
  };

  const handleSend = async (id: string) => {
    setActionLoading(id);
    try {
      await fetch(`/api/dashboard/campaigns/${id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      await fetchCampaigns();
    } catch (err) {
      console.error('Error sending campaign:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    setActionLoading(id);
    try {
      await fetch(`/api/dashboard/campaigns/${id}`, {
        method: 'DELETE',
      });
      await fetchCampaigns();
    } catch (err) {
      console.error('Error deleting campaign:', err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
            <Megaphone className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Campanas</h1>
            <p className="text-sm text-gray-500">
              Envia mensajes masivos a tus clientes
            </p>
          </div>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nueva Campana
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          icon={<BarChart3 className="h-5 w-5 text-indigo-600" />}
          label="Total Campanas"
          value={kpis.total_campaigns}
        />
        <KpiCard
          icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
          label="Completadas"
          value={kpis.completed}
        />
        <KpiCard
          icon={<Clock className="h-5 w-5 text-amber-600" />}
          label="En Progreso"
          value={kpis.in_progress}
        />
        <KpiCard
          icon={<MessageSquare className="h-5 w-5 text-blue-600" />}
          label="Mensajes Enviados"
          value={kpis.total_messages_sent}
        />
      </div>

      {/* New Campaign Form */}
      {showForm && (
        <NewCampaignForm
          onCreated={() => {
            setShowForm(false);
            fetchCampaigns();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-100">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
              activeTab === tab.key
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white p-12 text-center shadow-sm">
          <Megaphone className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">
            Crea tu primera campana para enviar mensajes a tus clientes.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nueva Campana
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Audiencia
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mensajes
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredCampaigns.map((campaign) => (
                <tr key={campaign.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">
                      {campaign.name}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-600">
                      {getAudienceLabel(campaign)}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-600">
                      {campaign.messages_sent ?? 0}/{campaign.total_recipients ?? 0}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={campaign.status} />
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-500">
                      {new Date(campaign.created_at).toLocaleDateString('es-MX')}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {campaign.status === 'draft' && (
                        <button
                          onClick={() => {
                            /* TODO: open edit form */
                          }}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      {(campaign.status === 'draft' ||
                        campaign.status === 'scheduled') && (
                        <button
                          onClick={() => handleSend(campaign.id)}
                          disabled={actionLoading === campaign.id}
                          className="rounded-lg p-1.5 text-indigo-500 hover:bg-indigo-50 hover:text-indigo-700 transition-colors disabled:opacity-50"
                          title="Enviar"
                        >
                          {actionLoading === campaign.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </button>
                      )}
                      {campaign.status === 'draft' && (
                        <button
                          onClick={() => handleDelete(campaign.id)}
                          disabled={actionLoading === campaign.id}
                          className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
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
  );
}
