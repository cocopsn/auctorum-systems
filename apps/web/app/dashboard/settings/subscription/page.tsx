'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  Crown,
  Zap,
  Building2,
  ExternalLink,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Subscription {
  id: string;
  tenant_id: string;
  plan: string;
  status: string;
  amount: number;
  currency: string;
  billing_cycle: string;
  current_period_start: string;
  current_period_end: string;
  payment_method: string | null;
  processor_subscription_id: string | null;
  grace_period_days: number;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

interface PlanDefinition {
  key: string;
  name: string;
  price: string;
  priceDetail: string;
  features: string[];
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  buttonClass: string;
  buttonLabel: string;
  contactOnly?: boolean;
}

// ---------------------------------------------------------------------------
// Plan definitions
// ---------------------------------------------------------------------------

const PLANS: PlanDefinition[] = [
  {
    key: 'basico',
    name: 'Free',
    price: '$1,400',
    priceDetail: 'MXN/mes',
    features: ['100 conversaciones', '1 usuario', 'Funciones basicas'],
    icon: Zap,
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    buttonClass:
      'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
    buttonLabel: 'Cambiar',
  },
  {
    key: 'auctorum',
    name: 'Pro',
    price: '$1,800',
    priceDetail: 'MXN/mes',
    features: ['1,000 conversaciones', '5 usuarios', 'Todas las funciones'],
    icon: Crown,
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    buttonClass:
      'bg-indigo-600 text-white hover:bg-indigo-700',
    buttonLabel: 'Cambiar',
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: 'Contactar',
    priceDetail: '',
    features: ['Ilimitado', 'Soporte dedicado', 'Customizacion'],
    icon: Building2,
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    buttonClass:
      'border border-amber-300 bg-white text-amber-700 hover:bg-amber-50',
    buttonLabel: 'Contactar',
    contactOnly: true,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    active: { label: 'Activo', className: 'bg-green-50 text-green-700' },
    past_due: { label: 'Pago pendiente', className: 'bg-red-50 text-red-700' },
    cancelled: { label: 'Cancelado', className: 'bg-gray-100 text-gray-500' },
  };
  const entry = map[status] ?? { label: status, className: 'bg-gray-100 text-gray-500' };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${entry.className}`}
    >
      {entry.label}
    </span>
  );
}

function planBadge(plan: string) {
  const map: Record<string, { label: string; className: string }> = {
    free: { label: 'Free', className: 'bg-gray-100 text-gray-700' },
    pro: { label: 'Pro', className: 'bg-indigo-50 text-indigo-700' },
    enterprise: { label: 'Enterprise', className: 'bg-amber-50 text-amber-700' },
  };
  const entry = map[plan] ?? { label: plan, className: 'bg-gray-100 text-gray-500' };
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${entry.className}`}
    >
      {entry.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SubscriptionSettingsPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard/settings/subscription', { credentials: 'include' });
      if (!res.ok) throw new Error('Error al cargar suscripcion');
      const data = await res.json();
      setSubscription(data.subscription);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const handleChangePlan = async (plan: string) => {
    // Enterprise is contact-only
    if (plan === 'enterprise') {
      window.open(
        'https://wa.me/528446644307?text=Hola,%20me%20interesa%20el%20plan%20Enterprise',
        '_blank'
      );
      return;
    }

    try {
      setChanging(plan);
      setError(null);
      setSuccess(null);

      const res = await fetch('/api/dashboard/settings/subscription', {
        credentials: 'include',
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Error al cambiar plan');
      }

      const data = await res.json();
      setSubscription(data.subscription);
      setSuccess(`Plan cambiado a ${plan.charAt(0).toUpperCase() + plan.slice(1)} exitosamente`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setChanging(null);
    }
  };

  // ---- Render ----

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const currentPlan = subscription?.plan ?? 'basico';

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-8 px-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
          <Sparkles className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suscripcion</h1>
          <p className="text-sm text-gray-500">Administra tu plan y facturacion</p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <XCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      {/* Current plan card */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="px-6 py-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tu Plan Actual</h2>

          {subscription ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {planBadge(subscription.plan)}
                {statusBadge(subscription.status)}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Monto</p>
                  <p className="text-lg font-semibold text-gray-900">
                    ${subscription.amount?.toLocaleString('es-MX') ?? '0'}{' '}
                    <span className="text-sm font-normal text-gray-500">
                      {subscription.currency ?? 'MXN'}/mes
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Periodo</p>
                  <p className="text-sm text-gray-700">
                    {formatDate(subscription.current_period_start)} &mdash;{' '}
                    {formatDate(subscription.current_period_end)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Proximo cobro</p>
                  <p className="text-sm text-gray-700">
                    {formatDate(subscription.current_period_end)}
                  </p>
                </div>
                {subscription.cancelled_at && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Cancelado el</p>
                    <p className="text-sm text-gray-700">
                      {formatDate(subscription.cancelled_at)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              <p>No tienes una suscripcion activa. Selecciona un plan a continuacion.</p>
            </div>
          )}
        </div>
      </div>

      {/* Available plans */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Planes Disponibles</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isCurrent = currentPlan === plan.key;
            const isChanging = changing === plan.key;

            return (
              <div
                key={plan.key}
                className={`rounded-xl border bg-white shadow-sm flex flex-col ${
                  isCurrent ? plan.borderColor + ' ring-2 ring-offset-1' : 'border-gray-100'
                } ${isCurrent && plan.key === 'auctorum' ? 'ring-indigo-300' : ''} ${
                  isCurrent && plan.key === 'basico' ? 'ring-gray-300' : ''
                } ${isCurrent && plan.key === 'enterprise' ? 'ring-amber-300' : ''}`}
              >
                <div className="px-5 pt-5 pb-4 flex-1">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${plan.bgColor} mb-3`}
                  >
                    <Icon className={`h-5 w-5 ${plan.color}`} />
                  </div>
                  <h3 className={`text-lg font-bold ${plan.color}`}>{plan.name}</h3>
                  <div className="mt-1 mb-4">
                    <span className="text-2xl font-bold text-gray-900">{plan.price}</span>
                    {plan.priceDetail && (
                      <span className="text-sm text-gray-500 ml-1">{plan.priceDetail}</span>
                    )}
                  </div>
                  <ul className="space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="px-5 pb-5">
                  <button
                    onClick={() => handleChangePlan(plan.key)}
                    disabled={isCurrent || isChanging}
                    className={`w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 flex items-center justify-center gap-2 ${
                      isCurrent
                        ? 'border border-gray-200 bg-gray-50 text-gray-400 cursor-default'
                        : plan.buttonClass
                    }`}
                  >
                    {isChanging ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : plan.contactOnly && !isCurrent ? (
                      <>
                        {plan.buttonLabel}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </>
                    ) : null}
                    {!isChanging && isCurrent && 'Plan actual'}
                    {!isChanging && !isCurrent && !plan.contactOnly && plan.buttonLabel}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Help link */}
      <div className="text-center pt-2 pb-4">
        <a
          href="https://wa.me/528446644307?text=Hola,%20necesito%20ayuda%20con%20mi%20suscripcion"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition-colors"
        >
          Necesitas ayuda? Contactanos
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
