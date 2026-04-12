'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { Settings, FileText, CheckCircle2, Loader2 } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface InvoiceConfig {
  enabled?: boolean;
  facturapiApiKey?: string;
  emisor?: {
    rfc?: string;
    razonSocial?: string;
    regimenFiscal?: string;
    codigoPostal?: string;
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function InvoicesSettingsPage() {
  const [config, setConfig] = useState<InvoiceConfig>({
    enabled: false,
    facturapiApiKey: '',
    emisor: {
      rfc: '',
      razonSocial: '',
      regimenFiscal: '',
      codigoPostal: '',
    },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ------------------------------------------------------------------
  // Load config
  // ------------------------------------------------------------------
  useEffect(() => {
    (async () => {
      const res = await fetch('/api/dashboard/invoices/config', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.invoiceConfig) {
          setConfig({
            enabled: data.invoiceConfig.enabled ?? false,
            facturapiApiKey: data.invoiceConfig.facturapiApiKey ?? '',
            emisor: {
              rfc: data.invoiceConfig.emisor?.rfc ?? '',
              razonSocial: data.invoiceConfig.emisor?.razonSocial ?? '',
              regimenFiscal: data.invoiceConfig.emisor?.regimenFiscal ?? '',
              codigoPostal: data.invoiceConfig.emisor?.codigoPostal ?? '',
            },
          });
        }
      }
      setLoading(false);
    })();
  }, []);

  // ------------------------------------------------------------------
  // Save config
  // ------------------------------------------------------------------
  async function handleSave() {
    setSaving(true);
    setSaved(false);

    const res = await fetch('/api/dashboard/invoices/config', {
      credentials: 'include',
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });

    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">Configuracion de Facturacion</h1>
      </div>

      {/* Toggle facturacion */}
      <div className="rounded-xl border border-gray-100 bg-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-indigo-600" />
            <div>
              <p className="font-medium text-gray-900">Habilitar facturacion electronica</p>
              <p className="text-sm text-gray-500">
                Permite a tus clientes solicitar facturas CFDI 4.0
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={config.enabled}
            onClick={() => setConfig({ ...config, enabled: !config.enabled })}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
              config.enabled ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                config.enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Facturapi API Key */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Proveedor de timbrado</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Facturapi API Key
          </label>
          <input
            type="password"
            value={config.facturapiApiKey ?? ''}
            onChange={(e) => setConfig({ ...config, facturapiApiKey: e.target.value })}
            placeholder="sk_live_..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          <p className="mt-1 text-xs text-gray-400">
            Obten tu API Key en facturapi.io
          </p>
        </div>
      </div>

      {/* Datos del emisor */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Datos del emisor</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">RFC</label>
            <input
              type="text"
              value={config.emisor?.rfc ?? ''}
              onChange={(e) =>
                setConfig({
                  ...config,
                  emisor: { ...config.emisor, rfc: e.target.value.toUpperCase() },
                })
              }
              maxLength={13}
              placeholder="XAXX010101000"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm uppercase focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Razon Social</label>
            <input
              type="text"
              value={config.emisor?.razonSocial ?? ''}
              onChange={(e) =>
                setConfig({
                  ...config,
                  emisor: { ...config.emisor, razonSocial: e.target.value },
                })
              }
              placeholder="Tu empresa S.A. de C.V."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Regimen Fiscal</label>
            <input
              type="text"
              value={config.emisor?.regimenFiscal ?? ''}
              onChange={(e) =>
                setConfig({
                  ...config,
                  emisor: { ...config.emisor, regimenFiscal: e.target.value },
                })
              }
              placeholder="601, 612, 616..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Codigo Postal</label>
            <input
              type="text"
              value={config.emisor?.codigoPostal ?? ''}
              onChange={(e) =>
                setConfig({
                  ...config,
                  emisor: { ...config.emisor, codigoPostal: e.target.value },
                })
              }
              maxLength={5}
              placeholder="64000"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            'Guardar Configuracion'
          )}
        </button>
        {saved && (
          <span className="inline-flex items-center gap-1 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" /> Guardado
          </span>
        )}
      </div>
    </div>
  );
}
