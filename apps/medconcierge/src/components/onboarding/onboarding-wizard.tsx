'use client'

import { useState, useEffect } from 'react'
import { Check, ChevronLeft, SkipForward } from 'lucide-react'

type StepDefinition = {
  key: string
  label: string
  title: string
  description: string
  href: string
}

type StepsCompleted = Record<string, boolean | undefined>

export function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [stepsCompleted, setStepsCompleted] = useState<StepsCompleted>({})
  const [steps, setSteps] = useState<StepDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/onboarding')
      .then((r) => r.json())
      .then((data) => {
        if (data.completed) {
          onComplete()
          return
        }
        setSteps(data.steps || [])
        setStepsCompleted(data.stepsCompleted || {})
        setCurrentStep(Math.min(data.currentStep || 0, Math.max((data.steps || []).length - 1, 0)))
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
      setStepsCompleted(data.stepsCompleted || {})
      if (data.completed) {
        onComplete()
      } else if (currentStep < steps.length - 1) {
        setCurrentStep((value) => value + 1)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (steps.length === 0) return null

  const step = steps[currentStep]

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-10">
        {steps.map((item, index) => {
          const completed = !!stepsCompleted[item.key]
          const active = index === currentStep
          return (
            <div key={item.key} className="flex items-center flex-1">
              <button onClick={() => setCurrentStep(index)} className={`relative flex flex-col items-center ${active ? 'scale-110' : ''} transition-transform`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${completed ? 'bg-green-500 text-white' : active ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' : 'bg-gray-200 text-gray-400'}`}>
                  {completed ? <Check className="h-5 w-5" /> : <span className="text-xs font-semibold">{index + 1}</span>}
                </div>
                <span className={`text-[10px] mt-1.5 font-medium ${active ? 'text-indigo-600' : completed ? 'text-green-600' : 'text-gray-400'}`}>
                  {item.label}
                </span>
              </button>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 mt-[-12px] ${completed ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <p className="text-xs text-gray-400 font-medium">Paso {currentStep + 1} de {steps.length}</p>
        <h2 className="text-lg font-semibold text-gray-900 mt-1">{step.title}</h2>
        <p className="text-sm text-gray-500 mt-2">{step.description}</p>

        <div className="mt-6 rounded-xl bg-indigo-50 p-4 text-sm text-indigo-700">
          Continua en <a href={step.href} className="font-semibold underline underline-offset-2">{step.href}</a> para completar este paso.
        </div>

        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
          <button
            onClick={() => setCurrentStep((value) => Math.max(0, value - 1))}
            disabled={currentStep === 0}
            className="flex items-center gap-1 px-4 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>

          <div className="flex items-center gap-3">
            <button onClick={skipAll} className="flex items-center gap-1 px-4 py-2 text-sm text-gray-400 hover:text-gray-600">
              <SkipForward className="h-3 w-3" />
              Saltar todo
            </button>
            <button
              onClick={() => markStepComplete(step.key)}
              disabled={saving}
              className="flex items-center gap-1 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Guardando...' : currentStep === steps.length - 1 ? 'Completar' : 'Marcar listo'}
              {!saving && <Check className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
