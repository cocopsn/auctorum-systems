'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { Settings, CreditCard, Banknote, CheckCircle2, Loader2 } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface PaymentConfig {
  activeProcessor?: string;
  mercadopago?: { accessToken?: string; enabled?: boolean };
  manual?: { enabled?: boolean };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function PaymentsSettingsPage() {
  const [config, setConfig] = useState<PaymentConfig>({
    activeProcessor: 'manual',
    mercadopago: { accessToken: '', enabled: false },
    manual: { enabled: true },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ------------------------------------------------------------------
  // Load config
  // ------------------------------------------------------------------
  useEffect(() => {
    (async () => {
      const res = await fetch('/api/dashboard/payments/config');
      if (res.ok) {
        const data = await res.json();
        if (data.paymentConfig) {
          setConfig({
            activeProcessor: data.paymentConfig.activeProcessor ?? 'manual',
            mercadopago: {
              accessToken: data.paymentConfig.mercadopago?.accessToken ?? '',
              enabled: data.paymentConfig.mercadopago?.enabled ?? false,
            },
            manual: {
              enabled: data.paymentConfig.manual?.enabled ?? true,
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

    const res = await fetch('/api/dashboard/payments/config', {
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
        <h1 className="text-2xl font-bold text-gray-900">Configuracion de Pagos</h1>
      </div>

      {/* Active processor selector */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Procesador activo</h2>
        <div className="space-y-3">
          {[
            { value: 'manual', label: 'Manual' },
            { value: 'mercadopago', label: 'MercadoPago' },
            // Stripe option removed — Stripe Connect onboarding lives in
            // /settings/subscription (OAuth flow into tenants.stripe_connect_*).
            // Storing a raw `sk_live_...` here was a security/compliance
            // liability and the form effectively duplicated Connect config.
          ].map((opt) => (
            <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="activeProcessor"
                value={opt.value}
                checked={config.activeProcessor === opt.value}
                onChange={() => setConfig({ ...config, activeProcessor: opt.value })}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm font-medium text-gray-700">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* MercadoPago card */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">MercadoPago</h2>
          </div>
          {config.mercadopago?.accessToken ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2.5 py-0.5 text-xs font-medium text-green-700">
              <CheckCircle2 className="h-3 w-3" /> Configurado
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-gray-50 border border-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-500">
              No configurado
            </span>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Access Token</label>
          <input
            type="password"
            value={config.mercadopago?.accessToken ?? ''}
            onChange={(e) =>
              setConfig({
                ...config,
                mercadopago: { ...config.mercadopago, accessToken: e.target.value },
              })
            }
            placeholder="APP_USR-..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Manual card */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 space-y-2">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gray-100 p-2">
            <Banknote className="h-5 w-5 text-gray-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Manual</h2>
        </div>
        <p className="text-sm text-gray-500">
          Pagos en efectivo, transferencia o tarjeta registrados manualmente
        </p>
        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2.5 py-0.5 text-xs font-medium text-green-700">
          <CheckCircle2 className="h-3 w-3" /> Siempre disponible
        </span>
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
