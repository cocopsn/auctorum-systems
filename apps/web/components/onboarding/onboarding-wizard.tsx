'use client'

import { useState, useEffect } from 'react'
import { Check, Building2, MessageSquare, Package, Clock, Rocket, ChevronRight, ChevronLeft, SkipForward } from 'lucide-react'

type StepsCompleted = {
  business_configured?: boolean
  whatsapp_connected?: boolean
  first_product_or_service?: boolean
  schedule_configured?: boolean
  test_quote_or_appointment?: boolean
}

const STEPS = [
  { key: 'business_configured', label: 'Negocio', title: 'Configura tu negocio', icon: Building2, description: 'Información básica de tu empresa o consultorio' },
  { key: 'whatsapp_connected', label: 'WhatsApp', title: 'Conecta WhatsApp', icon: MessageSquare, description: 'Configura el canal de comunicación con tus clientes' },
  { key: 'first_product_or_service', label: 'Producto', title: 'Crea tu primer producto o servicio', icon: Package, description: 'Agrega lo que ofreces a tus clientes' },
  { key: 'schedule_configured', label: 'Horarios', title: 'Configura horarios', icon: Clock, description: 'Define tu disponibilidad y condiciones' },
  { key: 'test_quote_or_appointment', label: 'Prueba', title: 'Haz una prueba', icon: Rocket, description: 'Verifica que todo funciona correctamente' },
]

export function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [stepsCompleted, setStepsCompleted] = useState<StepsCompleted>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/onboarding')
      .then(r => r.json())
      .then(data => {
        if (data.completed) {
          onComplete()
          return
        }
        setStepsCompleted(data.stepsCompleted || {})
        const completedCount = Object.values(data.stepsCompleted || {}).filter(Boolean).length
        setCurrentStep(Math.min(completedCount, 4))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [onComplete])

  async function markStepComplete(stepKey: string) {
    setSaving(true)
    try {
      const res = await fetch('/api/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepKey, completed: true }),
      })
      const data = await res.json()
      setStepsCompleted(data.stepsCompleted)
      if (data.completed) {
        onComplete()
      } else if (currentStep < 4) {
        setCurrentStep(s => s + 1)
      }
    } catch {}
    setSaving(false)
  }

  async function skipAll() {
    setSaving(true)
    try {
      await fetch('/api/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skipAll: true }),
      })
      onComplete()
    } catch {}
    setSaving(false)
  }

  function skipStep() {
    if (currentStep < 4) {
      setCurrentStep(s => s + 1)
    } else {
      skipAll()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const step = STEPS[currentStep]
  const StepIcon = step.icon

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      {/* Progress bar */}
      <div className="flex items-center justify-between mb-10">
        {STEPS.map((s, i) => {
          const completed = !!(stepsCompleted as any)[s.key]
          const active = i === currentStep
          const Icon = s.icon
          return (
            <div key={s.key} className="flex items-center flex-1">
              <button
                onClick={() => setCurrentStep(i)}
                className={`relative flex flex-col items-center ${active ? 'scale-110' : ''} transition-transform`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  completed
                    ? 'bg-green-500 text-white'
                    : active
                    ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
                    : 'bg-gray-200 text-gray-400'
                }`}>
                  {completed ? <Check className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className={`text-[10px] mt-1.5 font-medium ${
                  active ? 'text-indigo-600' : completed ? 'text-green-600' : 'text-gray-400'
                }`}>
                  {s.label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 mt-[-12px] ${
                  completed ? 'bg-green-400' : 'bg-gray-200'
                }`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Step content */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <StepIcon className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Paso {currentStep + 1} de 5</p>
            <h2 className="text-lg font-semibold text-gray-900">{step.title}</h2>
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-6">{step.description}</p>

        {/* Step-specific content */}
        {currentStep === 0 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Ve a <a href="/dashboard/settings" className="text-indigo-600 hover:underline font-medium">Configuración</a> para
              completar los datos de tu negocio: nombre, logo, colores, dirección, teléfono y WhatsApp.
            </p>
            <div className="bg-indigo-50 rounded-xl p-4 text-sm text-indigo-700">
              Si ya configuraste estos datos durante el registro, puedes marcar este paso como completado.
            </div>
          </div>
        )}
        {currentStep === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Para conectar WhatsApp Business API necesitas:
            </p>
            <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
              <li>Una cuenta de Meta Business Suite</li>
              <li>Un número de teléfono registrado en WhatsApp Business</li>
              <li>Configurar el webhook en Meta Developers</li>
            </ol>
            <div className="bg-amber-50 rounded-xl p-4 text-sm text-amber-700">
              Si aún no tienes WhatsApp Business configurado, puedes saltar este paso y configurarlo después.
            </div>
          </div>
        )}
        {currentStep === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Agrega tu primer producto o servicio desde el panel correspondiente:
            </p>
            <div className="flex gap-3">
              <a href="/dashboard/products" className="flex-1 p-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors text-center">
                <Package className="h-6 w-6 text-indigo-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">Productos</p>
                <p className="text-xs text-gray-500">Para cotizaciones B2B</p>
              </a>
              <a href="/horarios" className="flex-1 p-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors text-center">
                <Clock className="h-6 w-6 text-indigo-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">Servicios</p>
                <p className="text-xs text-gray-500">Para citas médicas</p>
              </a>
            </div>
          </div>
        )}
        {currentStep === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Configura tus horarios de atención y condiciones:
            </p>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>Horarios por día de la semana</li>
              <li>Duración de citas/consultas</li>
              <li>Condiciones de pago y vigencia</li>
            </ul>
            <a href="/horarios" className="inline-flex items-center gap-1 text-sm text-indigo-600 font-medium hover:underline">
              Ir a configurar horarios <ChevronRight className="h-3 w-3" />
            </a>
          </div>
        )}
        {currentStep === 4 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Realiza una prueba para verificar que todo funciona:
            </p>
            <div className="flex gap-3">
              <div className="flex-1 p-4 rounded-xl border border-gray-200 text-center">
                <Rocket className="h-6 w-6 text-indigo-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">Enviar cotización de prueba</p>
                <p className="text-xs text-gray-500 mt-1">Crea una cotización y envíala a tu propio WhatsApp</p>
              </div>
              <div className="flex-1 p-4 rounded-xl border border-gray-200 text-center">
                <Rocket className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">Agendar cita de prueba</p>
                <p className="text-xs text-gray-500 mt-1">Agenda una cita desde el portal público</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
          <button
            onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
            disabled={currentStep === 0}
            className="flex items-center gap-1 px-4 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={skipStep}
              className="flex items-center gap-1 px-4 py-2 text-sm text-gray-400 hover:text-gray-600"
            >
              <SkipForward className="h-3 w-3" />
              Saltar
            </button>
            <button
              onClick={() => markStepComplete(step.key)}
              disabled={saving}
              className="flex items-center gap-1 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Guardando...' : currentStep === 4 ? 'Completar' : 'Marcar listo'}
              {!saving && <Check className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Skip all */}
      <div className="text-center mt-6">
        <button
          onClick={skipAll}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Saltar todo y ir al dashboard
        </button>
      </div>
    </div>
  )
}
