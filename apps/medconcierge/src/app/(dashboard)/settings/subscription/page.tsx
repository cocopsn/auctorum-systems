'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  Crown,
  Zap,
  Building2,
  ExternalLink,
  CreditCard,
  Store,
  Settings,
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
  stripe_customer_id: string | null;
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
  popular?: boolean;
}

// ---------------------------------------------------------------------------
// Plan definitions
// ---------------------------------------------------------------------------

const PLANS: PlanDefinition[] = [
  {
    key: 'basico',
    name: 'Plan Básico',
    price: '$1,400',
    priceDetail: 'MXN/mes',
    features: [
      'Chatbot WhatsApp IA',
      'Agenda automatizada',
      'Recordatorios 24h+1h',
      'Landing personalizada',
      'Portal pacientes',
      '200 msgs/mes',
    ],
    icon: Zap,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  {
    key: 'auctorum',
    name: 'Plan Auctorum',
    price: '$1,800',
    priceDetail: 'MXN/mes',
    features: [
      'Todo del Plan Básico',
      'Expedientes clínicos',
      'Campañas WhatsApp',
      'Dashboard personalizable',
      'Google Calendar',
      'Soporte prioritario',
      '1,000 msgs/mes',
    ],
    icon: Crown,
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    popular: true,
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: 'Contactar',
    priceDetail: '',
    features: [
      'Todo del Plan Auctorum',
      'Usuarios ilimitados',
      'Soporte dedicado',
      'Personalización completa',
      'SLA garantizado',
    ],
    icon: Building2,
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
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
    trial: { label: 'Prueba', className: 'bg-blue-50 text-blue-700' },
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
    basico: { label: 'Básico', className: 'bg-blue-50 text-blue-700' },
    auctorum: { label: 'Auctorum', className: 'bg-indigo-50 text-indigo-700' },
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
  const searchParams = useSearchParams();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Handle query param messages (from Stripe/MP redirects)
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setSuccess('¡Pago exitoso! Tu suscripción ha sido activada.');
    } else if (searchParams.get('cancelled') === 'true') {
      setError('El pago fue cancelado. Puedes intentar de nuevo.');
    } else if (searchParams.get('failed') === 'true') {
      setError('El pago falló. Intenta con otro método de pago.');
    } else if (searchParams.get('pending') === 'true') {
      setSuccess('Tu pago está pendiente de confirmación. Te notificaremos cuando se acredite.');
    }
  }, [searchParams]);

  const fetchSubscription = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard/settings/subscription');
      if (!res.ok) throw new Error('Error al cargar suscripción');
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

  // Stripe checkout
  const handleStripeCheckout = async (planId: string) => {
    try {
      setCheckingOut(`stripe-${planId}`);
      setError(null);
      const res = await fetch('/api/dashboard/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al iniciar pago');
      if (data.url) window.location.href = data.url;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCheckingOut(null);
    }
  };

  // MercadoPago checkout
  const handleMPCheckout = async (planId: string) => {
    try {
      setCheckingOut(`mp-${planId}`);
      setError(null);
      const res = await fetch('/api/dashboard/billing/checkout-mp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al iniciar pago');
      if (data.url) window.location.href = data.url;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCheckingOut(null);
    }
  };

  // Stripe Customer Portal
  const handlePortal = async () => {
    try {
      setCheckingOut('portal');
      setError(null);
      const res = await fetch('/api/dashboard/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al abrir portal');
      if (data.url) window.location.href = data.url;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCheckingOut(null);
    }
  };

  // Enterprise WhatsApp
  const handleEnterprise = () => {
    window.open(
      'https://wa.me/528445387404?text=Hola,%20me%20interesa%20el%20plan%20Enterprise%20de%20Auctorum',
      '_blank'
    );
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
          <h1 className="text-2xl font-bold text-gray-900">Suscripción</h1>
          <p className="text-sm text-gray-500">Administra tu plan y facturación</p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <XCircle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
          <button onClick={() => setSuccess(null)} className="ml-auto text-green-500 hover:text-green-700">
            <XCircle className="h-4 w-4" />
          </button>
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
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Próximo cobro</p>
                  <p className="text-sm text-gray-700">
                    {formatDate(subscription.current_period_end)}
                  </p>
                </div>
                {subscription.payment_method && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Método de pago</p>
                    <p className="text-sm text-gray-700 capitalize">{subscription.payment_method}</p>
                  </div>
                )}
                {subscription.cancelled_at && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Cancelado el</p>
                    <p className="text-sm text-gray-700">
                      {formatDate(subscription.cancelled_at)}
                    </p>
                  </div>
                )}
              </div>

              {/* Manage subscription button — only if has Stripe customer */}
              {subscription.stripe_customer_id && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={handlePortal}
                    disabled={checkingOut === 'portal'}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {checkingOut === 'portal' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Settings className="h-4 w-4" />
                    )}
                    Administrar suscripción
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              <p>No tienes una suscripción activa. Selecciona un plan a continuación.</p>
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
            const isEnterprise = plan.key === 'enterprise';

            return (
              <div
                key={plan.key}
                className={`rounded-xl border bg-white shadow-sm flex flex-col relative ${
                  isCurrent
                    ? plan.borderColor + ' ring-2 ring-offset-1 ring-indigo-300'
                    : 'border-gray-100'
                }`}
              >
                {plan.popular && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center rounded-full bg-indigo-600 px-3 py-0.5 text-xs font-semibold text-white">
                      Recomendado
                    </span>
                  </div>
                )}

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

                <div className="px-5 pb-5 space-y-2">
                  {isCurrent ? (
                    <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-400 text-center">
                      Plan actual
                    </div>
                  ) : isEnterprise ? (
                    <button
                      onClick={handleEnterprise}
                      className="w-full rounded-lg border border-amber-300 bg-white text-amber-700 hover:bg-amber-50 px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      Contactar ventas
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleStripeCheckout(plan.key)}
                        disabled={!!checkingOut}
                        className="w-full rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {checkingOut === `stripe-${plan.key}` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CreditCard className="h-4 w-4" />
                        )}
                        Pagar con tarjeta
                      </button>
                      <button
                        onClick={() => handleMPCheckout(plan.key)}
                        disabled={!!checkingOut}
                        className="w-full rounded-lg border border-blue-300 bg-white text-blue-700 hover:bg-blue-50 px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {checkingOut === `mp-${plan.key}` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Store className="h-4 w-4" />
                        )}
                        Pagar con OXXO/SPEI
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Help link */}
      <div className="text-center pt-2 pb-4">
        <a
          href="https://wa.me/528445387404?text=Hola,%20necesito%20ayuda%20con%20mi%20suscripci%C3%B3n"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition-colors"
        >
          ¿Necesitas ayuda? Contáctanos
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
