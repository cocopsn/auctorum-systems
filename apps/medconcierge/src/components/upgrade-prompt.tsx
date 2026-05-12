'use client'

import { Sparkles, X, ArrowRight, Check } from 'lucide-react'

// Spanish copy for every gated feature. Keys MUST match the server-side
// `feature` field returned in 402 responses (apps/medconcierge/src/lib/plan-gating.ts).
// If a new feature is added there, add a name here too — otherwise the
// modal renders the raw key and looks broken.
const FEATURE_NAMES: Record<string, string> = {
  campaigns: 'Campañas de WhatsApp',
  smart_documents: 'Documentos Inteligentes',
  api_access: 'API Pública',
  portal_builder: 'Constructor de portal web',
  reports_export: 'Exportar reportes (CSV / PDF)',
  instagram_dm: 'Bandeja de Instagram',
  stripe_connect: 'Cobros a pacientes (Stripe Connect)',
  cfdi_invoicing: 'Facturación CFDI 4.0',
  clinical_records_full: 'Expedientes clínicos completos',
  rag_knowledge_base: 'Base de conocimiento IA (RAG)',
  max_users: 'Más usuarios',
  max_doctors: 'Más médicos',
}

const AUCTORUM_BENEFITS = [
  'Campañas masivas por WhatsApp',
  'Documentos inteligentes con análisis IA',
  'Base de conocimiento IA personalizada (RAG)',
  'Bandeja de Instagram Direct integrada',
  'Cobros online a pacientes con Stripe Connect',
  'Facturación electrónica CFDI 4.0',
  'API pública para integraciones',
  'Exportar reportes en CSV y PDF',
  'Hasta 8 usuarios y 5 médicos',
]

export interface UpgradePromptProps {
  /** Server-returned feature code (e.g. 'campaigns', 'smart_documents'). */
  feature: string
  /** Called when the user dismisses the modal (X button or backdrop). */
  onClose: () => void
}

/**
 * Modal shown when a paid endpoint returns 402 with code='PLAN_LIMIT'.
 *
 * The 402 response contract (from packages/medconcierge plan-gating):
 *   { error: '...', code: 'PLAN_LIMIT', feature: '<key>' }
 *
 * Pre-2026-05-12 there was no UI for this — every gated endpoint just
 * silently returned an error JSON and the page would print a raw error
 * string. This component turns that into a conversion moment.
 */
export function UpgradePrompt({ feature, onClose }: UpgradePromptProps) {
  const featureName = FEATURE_NAMES[feature] ?? feature

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-prompt-title"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-teal-600 to-blue-600 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-8 h-8" />
            <h2 id="upgrade-prompt-title" className="text-xl font-bold">
              Plan Auctorum
            </h2>
          </div>
          <p className="text-teal-100 text-sm">
            {featureName} está disponible en el Plan Auctorum
          </p>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            Actualice su plan para desbloquear las funciones avanzadas:
          </p>
          <ul className="space-y-2 mb-6">
            {AUCTORUM_BENEFITS.slice(0, 6).map((benefit) => (
              <li
                key={benefit}
                className="flex items-center gap-2 text-sm text-gray-700"
              >
                <Check className="w-4 h-4 text-teal-500 shrink-0" />
                {benefit}
              </li>
            ))}
            <li className="text-xs text-gray-400 pl-6">
              ...y {AUCTORUM_BENEFITS.length - 6} beneficios más
            </li>
          </ul>

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-gray-900">$1,800</span>
              <span className="text-sm text-gray-500">MXN/mes</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Sin permanencia. Cancele cuando quiera.
            </p>
          </div>

          <a
            href="/settings/subscription"
            className="w-full flex items-center justify-center gap-2 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
          >
            Actualizar ahora
            <ArrowRight className="w-4 h-4" />
          </a>
          <button
            onClick={onClose}
            className="w-full mt-2 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Tal vez después
          </button>
        </div>
      </div>
    </div>
  )
}
