'use client';

import { useState, useTransition } from 'react';
import { Check, ChevronRight, Loader2 } from 'lucide-react';
import type { OnboardingSteps } from '@quote-engine/db';

type StepKey = keyof OnboardingSteps;

type StepDef = {
  key: StepKey;
  title: string;
  description: string;
  href: string;
  cta: string;
};

const STEPS: StepDef[] = [
  {
    key: 'business_configured',
    title: 'Configura tu negocio',
    description: 'Nombre, contacto, dirección y datos fiscales para tu portal.',
    href: '/dashboard/settings',
    cta: 'Ir a configuración',
  },
  {
    key: 'whatsapp_connected',
    title: 'Conecta WhatsApp',
    description: 'Vincula tu número para recibir y responder cotizaciones.',
    // Pre-2026-05-10 the anchor pointed to /dashboard/settings#integrations
    // but that ID didn't exist anywhere in SettingsClient — the link
    // dropped users at /settings without scrolling to anything. The
    // canonical channels config lives at /dashboard/settings/channels.
    href: '/dashboard/settings/channels',
    cta: 'Conectar',
  },
  {
    key: 'first_product_or_service',
    title: 'Crea tu primer producto',
    description: 'Define al menos un producto o servicio para cotizar.',
    href: '/dashboard/products',
    cta: 'Agregar producto',
  },
  {
    key: 'schedule_configured',
    title: 'Configura disponibilidad',
    description: 'Horarios de atención y reglas para el bot.',
    // Anchor #schedule didn't exist; horarios live at /dashboard/horarios
    // (or /dashboard/settings if the tenant only uses tenants.config.schedule).
    href: '/dashboard/horarios',
    cta: 'Configurar horario',
  },
  {
    key: 'test_quote_or_appointment',
    title: 'Genera una cotización de prueba',
    description: 'Crea una cotización para verificar el flujo end-to-end.',
    href: '/dashboard/quotes',
    cta: 'Crear cotización',
  },
];

interface Props {
  initialSteps: OnboardingSteps;
  completedAt: string | null;
  tenantName: string;
}

export function OnboardingChecklist({ initialSteps, completedAt, tenantName }: Props) {
  const [steps, setSteps] = useState<OnboardingSteps>(initialSteps);
  const [completed, setCompleted] = useState<string | null>(completedAt);
  const [pendingKey, setPendingKey] = useState<StepKey | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const doneCount = STEPS.filter((s) => steps[s.key] === true).length;
  const totalCount = STEPS.length;
  const progressPct = Math.round((doneCount / totalCount) * 100);

  async function markStep(key: StepKey, value: boolean) {
    setError(null);
    setPendingKey(key);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps: { [key]: value } }),
      });
      const json = await res.json();
      if (!res.ok || !json?.data) {
        throw new Error(json?.error ?? 'Error al actualizar');
      }
      setSteps(json.data.stepsJson ?? {});
      setCompleted(json.data.completedAt ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setPendingKey(null);
    }
  }

  async function skipAll() {
    setError(null);
    // React 18 typed startTransition rejects async callbacks; wrap the awaitable
    // in a fire-and-forget IIFE so the transition fn itself stays synchronous.
    startTransition(() => {
      void (async () => {
        try {
          const res = await fetch('/api/onboarding', { method: 'POST' });
          const json = await res.json();
          if (!res.ok || !json?.data) {
            throw new Error(json?.error ?? 'Error al saltar');
          }
          setCompleted(json.data.completedAt ?? null);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Error desconocido');
        }
      })();
    });
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <div className="mb-8">
        <p className="text-sm font-mono text-[var(--text-tertiary)] uppercase tracking-wide">
          {tenantName}
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-[var(--text-primary)]">
          Configura tu cuenta
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {completed
            ? 'Tu cuenta está completamente configurada. Puedes revisitar estos pasos cuando quieras.'
            : 'Completa estos pasos para sacar el máximo provecho del portal.'}
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-8 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {doneCount} de {totalCount} completados
          </span>
          <span className="text-sm font-mono text-[var(--text-tertiary)]">{progressPct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-[var(--error)]/30 bg-[var(--error)]/10 px-4 py-2.5 text-sm text-[var(--error)]">
          {error}
        </div>
      )}

      {/* Step list */}
      <ul className="space-y-3">
        {STEPS.map((step) => {
          const isDone = steps[step.key] === true;
          const isLoading = pendingKey === step.key;
          return (
            <li
              key={step.key}
              className={`rounded-xl border p-5 transition-colors ${
                isDone
                  ? 'border-[var(--success)]/30 bg-[var(--success)]/5'
                  : 'border-[var(--border)] bg-[var(--bg-secondary)]'
              }`}
            >
              <div className="flex items-start gap-4">
                <button
                  type="button"
                  onClick={() => markStep(step.key, !isDone)}
                  disabled={isLoading}
                  aria-label={isDone ? 'Marcar como pendiente' : 'Marcar como completado'}
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    isDone
                      ? 'border-[var(--success)] bg-[var(--success)] text-white'
                      : 'border-[var(--border-hover)] bg-[var(--bg-tertiary)] hover:border-[var(--accent)]'
                  } ${isLoading ? 'opacity-50' : ''}`}
                >
                  {isLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : isDone ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : null}
                </button>

                <div className="flex-1 min-w-0">
                  <h3
                    className={`text-sm font-semibold ${
                      isDone
                        ? 'text-[var(--text-tertiary)] line-through'
                        : 'text-[var(--text-primary)]'
                    }`}
                  >
                    {step.title}
                  </h3>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">{step.description}</p>
                </div>

                <a
                  href={step.href}
                  className="inline-flex items-center gap-1 self-center rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                >
                  {step.cta}
                  <ChevronRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-8 flex items-center justify-between">
        <a
          href="/dashboard"
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          ← Volver al dashboard
        </a>
        {!completed && (
          <button
            type="button"
            onClick={skipAll}
            disabled={isPending}
            className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] underline-offset-4 hover:underline transition-colors disabled:opacity-50"
          >
            {isPending ? 'Saltando…' : 'Saltar onboarding'}
          </button>
        )}
      </div>
    </div>
  );
}
