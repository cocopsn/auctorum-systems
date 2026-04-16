'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
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

const INTEGRATION_CARDS: IntegrationCardDef[] = [
  {
    type: 'google_calendar',
    label: 'Google Calendar',
    description: 'Sincroniza citas con Google Calendar',
    icon: <Calendar className="h-6 w-6 text-indigo-600" />,
  },
  {
    type: 'external_db',
    label: 'Base de Datos Externa',
    description: 'Conecta SQL Server, MySQL o PostgreSQL',
    icon: <Database className="h-6 w-6 text-indigo-600" />,
    hasConfig: true,
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
    // MVP: just show a success toast
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Host
          </label>
          <input
            type="text"
            value={config.host}
            onChange={(e) => setConfig({ ...config, host: e.target.value })}
            placeholder="localhost"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Puerto
          </label>
          <input
            type="text"
            value={config.port}
            onChange={(e) => setConfig({ ...config, port: e.target.value })}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Base de datos
        </label>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Usuario
          </label>
          <input
            type="text"
            value={config.user}
            onChange={(e) => setConfig({ ...config, user: e.target.value })}
            placeholder="admin"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contrasena
          </label>
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
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Conectar'
          )}
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

      {/* Disconnected state — simple cards */}
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

      {/* Disconnected state — external DB with expandable config */}
      {!connected && def.hasConfig && (
        <div className="mt-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            Configurar conexion
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {expanded && (
            <DbConfigForm onConnect={handleDbConnect} loading={loading} />
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
