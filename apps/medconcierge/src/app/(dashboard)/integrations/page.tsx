'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Plug,
  Calendar,
  Database,
  CreditCard,
  MessageCircle,
  FileText,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
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
  hasCustomConfig?: boolean;
  alwaysConnected?: boolean;
}

interface GCalOAuthStatus {
  connected: boolean;
  mode: 'oauth' | 'service_account' | null;
  email: string | null;
  calendarId: string | null;
  connectedAt: string | null;
  autoSync: boolean;
}

// ---------------------------------------------------------------------------
// Card definitions
// ---------------------------------------------------------------------------

const INTEGRATION_CARDS: IntegrationCardDef[] = [
  {
    type: 'google_calendar',
    label: 'Google Calendar',
    description: 'Sincroniza citas con Google Calendar automaticamente',
    icon: <Calendar className="h-6 w-6 text-indigo-600" />,
    hasCustomConfig: true,
  },
  // Removed 2026-05-10:
  //   - external_db (no consumer in code, the "Probar conexión" button
  //     was setTimeout theatre, the saved credentials never got read).
  //   - facturapi (canonical CFDI config lives at /settings/billing →
  //     tenants.invoice_config, consumed by invoice routes; the tile here
  //     wrote to a separate `integrations` row that nothing read).
  //   - mercadopago + whatsapp tiles (already removed earlier — see
  //     /settings/payments and /settings/channels respectively).
];

// ---------------------------------------------------------------------------
// Google Calendar OAuth Card
// ---------------------------------------------------------------------------

function GoogleCalendarOAuth({
  status,
  onRefresh,
}: {
  status: GCalOAuthStatus;
  onRefresh: () => void;
}) {
  const searchParams = useSearchParams();
  const googleResult = searchParams.get('google');
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (googleResult === 'connected') {
      setMessage({ type: 'success', text: 'Google Calendar conectado exitosamente' });
      onRefresh();
    } else if (googleResult === 'error') {
      const reason = searchParams.get('reason') || 'unknown';
      setMessage({ type: 'error', text: `Error al conectar Google Calendar: ${reason}` });
    }
  }, [googleResult, searchParams, onRefresh]);

  const handleDisconnect = async () => {
    if (!confirm('Desconectar Google Calendar? Las citas existentes no se eliminaran.')) return;
    setDisconnecting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/auth/google/disconnect', { method: 'POST' });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Google Calendar desconectado' });
        onRefresh();
      } else {
        setMessage({ type: 'error', text: 'Error al desconectar' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de red' });
    } finally {
      setDisconnecting(false);
    }
  };

  if (status.connected) {
    return (
      <div className="mt-4 space-y-3">
        <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <div>
            <span>Conectado</span>
            {status.email && (
              <span className="ml-1">
                a: <strong>{status.email}</strong>
              </span>
            )}
            {status.mode === 'oauth' && (
              <span className="ml-2 inline-flex items-center rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">
                OAuth
              </span>
            )}
          </div>
        </div>

        {status.autoSync && (
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            Sincronizacion automatica activada
          </p>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {disconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Desconectar'}
          </button>
        </div>

        {message && (
          <div className={`rounded-lg px-4 py-2 text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {message.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {message.text}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <p className="text-sm text-gray-600">
        Conecta tu Google Calendar con un click para sincronizar citas automaticamente.
      </p>

      <a
        href="/api/auth/google"
        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Conectar Google Calendar
      </a>

      {message && (
        <div className={`rounded-lg px-4 py-2 text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {message.text}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DB Config form (for external_db card)
// ---------------------------------------------------------------------------

interface DbConfig {
  dbType: string;
  host: string;
  port: string;
  database: string;
  user: string;
  password: string;
}

const DEFAULT_DB_CONFIG: DbConfig = {
  dbType: 'postgresql',
  host: '',
  port: '5432',
  database: '',
  user: '',
  password: '',
};

function DbConfigForm({
  onConnect,
  loading,
}: {
  onConnect: (config: DbConfig) => void;
  loading: boolean;
}) {
  const [config, setConfig] = useState<DbConfig>(DEFAULT_DB_CONFIG);
  const [testSuccess, setTestSuccess] = useState(false);

  const handleTest = () => {
    setTestSuccess(true);
    setTimeout(() => setTestSuccess(false), 3000);
  };

  const portDefaults: Record<string, string> = {
    sqlserver: '1433',
    mysql: '3306',
    postgresql: '5432',
  };

  return (
    <div className="mt-4 space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tipo de base de datos
        </label>
        <select
          value={config.dbType}
          onChange={(e) =>
            setConfig({
              ...config,
              dbType: e.target.value,
              port: portDefaults[e.target.value] ?? '5432',
            })
          }
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
        >
          <option value="postgresql">PostgreSQL</option>
          <option value="mysql">MySQL</option>
          <option value="sqlserver">SQL Server</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
          <input
            type="text"
            value={config.host}
            onChange={(e) => setConfig({ ...config, host: e.target.value })}
            placeholder="localhost"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Puerto</label>
          <input
            type="text"
            value={config.port}
            onChange={(e) => setConfig({ ...config, port: e.target.value })}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Base de datos</label>
        <input
          type="text"
          value={config.database}
          onChange={(e) => setConfig({ ...config, database: e.target.value })}
          placeholder="mi_base_de_datos"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
          <input
            type="text"
            value={config.user}
            onChange={(e) => setConfig({ ...config, user: e.target.value })}
            placeholder="admin"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contrasena</label>
          <input
            type="password"
            value={config.password}
            onChange={(e) => setConfig({ ...config, password: e.target.value })}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleTest}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Probar conexion
        </button>
        <button
          onClick={() => onConnect(config)}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Conectar'}
        </button>
        {testSuccess && (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            Conexion exitosa
          </span>
        )}
      </div>
    </div>
  );
}

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
  gcalStatus,
  onConnect,
  onDisconnect,
  onSync,
  onRefreshGcal,
  loading,
}: {
  def: IntegrationCardDef;
  integration: Integration | null;
  gcalStatus: GCalOAuthStatus;
  onConnect: (type: string, config?: Record<string, unknown>) => void;
  onDisconnect: (type: string) => void;
  onSync: (type: string) => void;
  onRefreshGcal: () => void;
  loading: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const isGcal = def.type === 'google_calendar';
  const connected =
    def.alwaysConnected ||
    (isGcal ? gcalStatus.connected : integration?.status === 'connected');

  const handleDbConnect = (dbConfig: DbConfig) => {
    onConnect(def.type, dbConfig as unknown as Record<string, unknown>);
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
            {def.icon}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{def.label}</h3>
            <p className="text-xs text-gray-500">{def.description}</p>
          </div>
        </div>
        <StatusBadge connected={connected} />
      </div>

      {/* Google Calendar OAuth */}
      {isGcal && <GoogleCalendarOAuth status={gcalStatus} onRefresh={onRefreshGcal} />}

      {/* Connected state (non-gcal) */}
      {connected && !def.alwaysConnected && !isGcal && (
        <div className="mt-4 space-y-3">
          {integration?.last_sync_at && (
            <p className="text-xs text-gray-500">
              Ultima sincronizacion: {new Date(integration.last_sync_at).toLocaleString('es-MX')}
            </p>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSync(def.type)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
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

      {/* Disconnected state — simple cards (non-gcal, non-db) */}
      {!connected && !def.hasConfig && !isGcal && (
        <div className="mt-4">
          <button
            onClick={() => onConnect(def.type)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Conectar'}
          </button>
        </div>
      )}

      {/* Disconnected state — external DB */}
      {!connected && def.hasConfig && (
        <div className="mt-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            Configurar conexion
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {expanded && <DbConfigForm onConnect={handleDbConnect} loading={loading} />}
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
  const [gcalStatus, setGcalStatus] = useState<GCalOAuthStatus>({
    connected: false,
    mode: null,
    email: null,
    calendarId: null,
    connectedAt: null,
    autoSync: false,
  });

  const fetchIntegrations = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/integrations');
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

  const fetchGcalStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/google/status');
      if (res.ok) {
        const data = await res.json();
        setGcalStatus(data);
      }
    } catch (err) {
      console.error('Error fetching gcal status:', err);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
    fetchGcalStatus();
  }, [fetchIntegrations, fetchGcalStatus]);

  const getIntegration = (type: string): Integration | null =>
    integrations.find((i) => i.type === type) ?? null;

  const handleConnect = async (type: string, config?: Record<string, unknown>) => {
    setActionLoading(type);
    try {
      await fetch(`/api/dashboard/integrations/${type}`, {
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
              gcalStatus={gcalStatus}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onSync={handleSync}
              onRefreshGcal={fetchGcalStatus}
              loading={actionLoading === def.type}
            />
          ))}
        </div>
      )}
    </div>
  );
}
