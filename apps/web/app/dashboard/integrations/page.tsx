'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import {
  Plug,
  Calendar,
  CreditCard,
  MessageCircle,
  FileText,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Integration {
  id: string;
  tenant_id: string;
  type: string;
  status: string;
  config: Record<string, unknown>;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

interface IntegrationCardDef {
  type: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  hasConfig?: boolean;
  alwaysConnected?: boolean;
}

// ---------------------------------------------------------------------------
// Card definitions
// ---------------------------------------------------------------------------

// Pre-2026-05-11 this list included an 'external_db' card with full
// SQL Server / MySQL / PostgreSQL connection form and a "Probar conexión"
// button. The test button was a 3-second setTimeout that flipped a
// green-checkmark state — no actual connection attempt was made. The
// "Conectar" button persisted an `integrations(type='external_db')` row
// that no consumer ever read (grep `external_db` across apps/web/app/api
// + packages returns 0 hits outside of the UI). Decoration with risk
// (it asked for DB passwords that were stored unused). Removed.
const INTEGRATION_CARDS: IntegrationCardDef[] = [
  {
    type: 'google_calendar',
    label: 'Google Calendar',
    description: 'Sincroniza citas con Google Calendar',
    icon: <Calendar className="h-6 w-6 text-indigo-600" />,
  },
  {
    type: 'mercadopago',
    label: 'MercadoPago',
    description: 'Procesa pagos con MercadoPago',
    icon: <CreditCard className="h-6 w-6 text-indigo-600" />,
  },
  {
    type: 'whatsapp',
    label: 'WhatsApp Business',
    description: 'Ya conectado via API',
    icon: <MessageCircle className="h-6 w-6 text-indigo-600" />,
    alwaysConnected: true,
  },
  {
    type: 'facturapi',
    label: 'Facturapi',
    description: 'Facturacion electronica CFDI',
    icon: <FileText className="h-6 w-6 text-indigo-600" />,
  },
];

// ---------------------------------------------------------------------------
// Pre-2026-05-12 this file shipped a DbConfigForm + DEFAULT_DB_CONFIG
// + DbConfig interface (~150 LOC) plus a handleDbConnect helper and
// an expandable "Configurar conexión" section, used by an external_db
// integration card. The card had a fake "Probar conexión" button
// (3-second setTimeout — never actually attempted a connection) and
// persisted DB credentials no consumer ever read. The card was
// removed in commit a10ffa7; this commit removes the rest of the
// dead form, the handler, the "Configurar conexión" expandable, and
// the now-orphan icon imports below to stop shipping ~200 LOC.

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ connected }: { connected: boolean }) {
  return connected ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
      <CheckCircle2 className="h-3 w-3" />
      Conectado
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
      <XCircle className="h-3 w-3" />
      Desconectado
    </span>
  );
}

// ---------------------------------------------------------------------------
// Integration Card
// ---------------------------------------------------------------------------

function IntegrationCard({
  def,
  integration,
  onConnect,
  onDisconnect,
  onSync,
  loading,
}: {
  def: IntegrationCardDef;
  integration: Integration | null;
  onConnect: (type: string, config?: Record<string, unknown>) => void;
  onDisconnect: (type: string) => void;
  onSync: (type: string) => void;
  loading: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const connected =
    def.alwaysConnected || integration?.status === 'connected';

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
            {def.icon}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              {def.label}
            </h3>
            <p className="text-xs text-gray-500">{def.description}</p>
          </div>
        </div>
        <StatusBadge connected={connected} />
      </div>

      {/* Connected state */}
      {connected && !def.alwaysConnected && (
        <div className="mt-4 space-y-3">
          {integration?.last_sync_at && (
            <p className="text-xs text-gray-500">
              Ultima sincronizacion:{' '}
              {new Date(integration.last_sync_at).toLocaleString('es-MX')}
            </p>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSync(def.type)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Sincronizar ahora
            </button>
            <button
              onClick={() => onDisconnect(def.type)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Desconectar
            </button>
          </div>
        </div>
      )}

      {/* Always connected (WhatsApp) */}
      {def.alwaysConnected && (
        <div className="mt-4">
          <p className="text-xs text-gray-500">
            Configurado a nivel de cuenta. Gestiona desde Configuracion.
          </p>
        </div>
      )}

      {/* Disconnected state — simple cards. `hasConfig` used to gate
          the external_db expandable form — removed but flag kept on
          the def type so future cards can opt into custom UI. */}
      {!connected && !def.hasConfig && (
        <div className="mt-4">
          {def.type === 'google_calendar' ? (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Para conectar Google Calendar, configura las credenciales OAuth
                en la consola de Google Cloud y agrega el redirect URI de tu
                cuenta.
              </p>
              <button
                onClick={() => onConnect(def.type)}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Conectar'
                )}
              </button>
            </div>
          ) : (
            <button
              onClick={() => onConnect(def.type)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Conectar'
              )}
            </button>
          )}
        </div>
      )}

    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchIntegrations = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/integrations', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data.integrations ?? []);
      }
    } catch (err) {
      console.error('Error fetching integrations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const getIntegration = (type: string): Integration | null =>
    integrations.find((i) => i.type === type) ?? null;

  const handleConnect = async (
    type: string,
    config?: Record<string, unknown>
  ) => {
    setActionLoading(type);
    try {
      await fetch(`/api/dashboard/integrations/${type}`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'connect', config: config ?? {} }),
      });
      await fetchIntegrations();
    } catch (err) {
      console.error('Error connecting integration:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisconnect = async (type: string) => {
    setActionLoading(type);
    try {
      await fetch(`/api/dashboard/integrations/${type}`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect' }),
      });
      await fetchIntegrations();
    } catch (err) {
      console.error('Error disconnecting integration:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSync = async (type: string) => {
    setActionLoading(type);
    try {
      await fetch(`/api/dashboard/integrations/${type}`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' }),
      });
      await fetchIntegrations();
    } catch (err) {
      console.error('Error syncing integration:', err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
          <Plug className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Integraciones</h1>
          <p className="text-sm text-gray-500">
            Conecta servicios externos para potenciar tu negocio
          </p>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {INTEGRATION_CARDS.map((def) => (
            <IntegrationCard
              key={def.type}
              def={def}
              integration={getIntegration(def.type)}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onSync={handleSync}
              loading={actionLoading === def.type}
            />
          ))}
        </div>
      )}
    </div>
  );
}
