'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type StepDef = {
  key: string
  label: string
  title: string
  description: string
  href: string
}

type OnboardingState = {
  completed: boolean
  tenantType: string
  plan: string
  currentStep: number
  stepsCompleted: Record<string, boolean>
  steps: StepDef[]
}

/* ------------------------------------------------------------------ */
/*  Local form state per step                                          */
/* ------------------------------------------------------------------ */

type ConsultorioForm = {
  businessName: string
  specialty: string
  customSpecialty?: string
  address: string
  phone: string
  primaryColor: string
  secondaryColor: string
}

type DaySchedule = {
  enabled: boolean
  start: string
  end: string
}

type HorariosForm = {
  days: Record<string, DaySchedule>
  duration: number
}

type ServiceRow = {
  name: string
  price: string
  duration: string
}

type ServiciosForm = {
  services: ServiceRow[]
}

type WhatsAppForm = {
  phone: string
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

// Inline specialty list (mirrors packages/ai/specialty-templates.ts metadata)
// Kept inline to avoid pulling the full ~30KB template payload into the client bundle.
const SPECIALTY_OPTIONS: Array<{ id: string; name: string; icon: string }> = [
  { id: 'odontologia',      name: 'Odontologia',      icon: '\u{1F9B7}' },
  { id: 'medicina_general', name: 'Medicina General',  icon: '\u{1FA7A}' },
  { id: 'dermatologia',     name: 'Dermatologia',      icon: '\u{1F9F4}' },
  { id: 'cardiologia',      name: 'Cardiologia',       icon: '\u2764\uFE0F' },
  { id: 'pediatria',        name: 'Pediatria',         icon: '\u{1F476}' },
  { id: 'ginecologia',      name: 'Ginecologia',       icon: '\u{1FA77}' },
  { id: 'traumatologia',    name: 'Traumatologia',     icon: '\u{1F9B4}' },
]

const DAY_LABELS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'] as const

const PRESET_COLORS = [
  '#0D9488', '#0EA5E9', '#6366F1', '#8B5CF6',
  '#EC4899', '#EF4444', '#F97316', '#EAB308',
  '#22C55E', '#1B3A5C', '#374151', '#000000',
]

const DURATION_OPTIONS = [15, 20, 30, 45, 60]

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [state, setState] = useState<OnboardingState | null>(null)
  const [activeStep, setActiveStep] = useState(0)

  // Step-specific local form state
  const [consultorio, setConsultorio] = useState<ConsultorioForm>({
    businessName: '',
    specialty: '',
    address: '',
    phone: '',
    primaryColor: '#0D9488',
    secondaryColor: '#1B3A5C',
  })

  const [horarios, setHorarios] = useState<HorariosForm>({
    days: Object.fromEntries(
      DAY_LABELS.map((d, i) => [
        d,
        { enabled: i < 5, start: '09:00', end: '18:00' },
      ])
    ),
    duration: 30,
  })

  const [servicios, setServicios] = useState<ServiciosForm>({
    services: [{ name: '', price: '', duration: '30' }],
  })

  const [whatsappPhone, setWhatsappPhone] = useState('')
  const [applyingTemplate, setApplyingTemplate] = useState(false)

  /* Apply specialty template ------------------------------------------*/
  const applySpecialtyTemplate = useCallback(
    async (specialtyId: string) => {
      if (!specialtyId || specialtyId === 'otra') return
      setApplyingTemplate(true)
      try {
        const res = await fetch('/api/onboarding/apply-specialty', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ specialtyId }),
        })
        if (!res.ok) return
        const data = await res.json()

        // Pre-fill step 2 (horarios) from template
        if (data.suggestedSchedule) {
          const sched = data.suggestedSchedule
          const newDays: Record<string, DaySchedule> = {}
          DAY_LABELS.forEach((day, i) => {
            if (i < 5) {
              // Weekdays
              newDays[day] = { enabled: true, start: sched.weekdays.start, end: sched.weekdays.end }
            } else if (i === 5 && sched.saturday) {
              // Saturday
              newDays[day] = { enabled: true, start: sched.saturday.start, end: sched.saturday.end }
            } else {
              // Sunday or Saturday when null
              newDays[day] = { enabled: false, start: '09:00', end: '18:00' }
            }
          })
          setHorarios({ days: newDays, duration: sched.consultDuration || 30 })
        }

        // Pre-fill step 3 (servicios) from template
        if (data.services && data.services.length > 0) {
          setServicios({
            services: data.services.map((s: { name: string; duration: number; price?: number }) => ({
              name: s.name,
              price: s.price ? String(s.price) : '',
              duration: String(s.duration),
            })),
          })
        }
      } catch {
        // Silent — template pre-fill is optional enhancement
      } finally {
        setApplyingTemplate(false)
      }
    },
    []
  )

  /* Fetch onboarding state -------------------------------------------*/
  useEffect(() => {
    fetch('/api/onboarding')
      .then((r) => r.json())
      .then((data: OnboardingState) => {
        if (data.completed) {
          router.replace('/')
          return
        }
        setState(data)
        setActiveStep(data.currentStep ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [router])

  /* Save a step via PATCH -------------------------------------------*/
  const saveStep = useCallback(
    async (stepKey: string) => {
      setSaving(true)
      try {
        const res = await fetch('/api/onboarding', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stepKey, completed: true }),
        })
        const data = await res.json()
        setState((prev) =>
          prev ? { ...prev, stepsCompleted: data.stepsCompleted ?? prev.stepsCompleted } : prev
        )
      } catch {
        // silent — user can retry
      } finally {
        setSaving(false)
      }
    },
    []
  )

  /* Publish / skip all ----------------------------------------------*/
  const publishAll = useCallback(async () => {
    setSaving(true)
    try {
      await fetch('/api/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skipAll: true }),
      })
      router.replace('/')
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }, [router])

  /* Navigation ------------------------------------------------------*/
  const stepKeys = state?.steps.map((s) => s.key) ?? []
  const totalSteps = stepKeys.length || 7

  const goNext = async () => {
    const key = stepKeys[activeStep]
    if (key) await saveStep(key)
    if (activeStep < totalSteps - 1) {
      setActiveStep((p) => p + 1)
    }
  }

  const goBack = () => {
    if (activeStep > 0) setActiveStep((p) => p - 1)
  }

  /* Render helpers ---------------------------------------------------*/
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    )
  }

  if (!state) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-500">No se pudo cargar el onboarding.</p>
      </div>
    )
  }

  const progressPercent = Math.round(((activeStep + 1) / totalSteps) * 100)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gray-200">
        <div
          className="h-full bg-teal-600 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex flex-col md:flex-row min-h-screen pt-1">
        {/* Sidebar / step indicator */}
        <aside className="w-full md:w-64 md:min-h-screen bg-white border-b md:border-b-0 md:border-r p-4 md:p-6 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Configura tu consultorio</h2>
          <nav className="flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible">
            {state.steps.map((step, i) => {
              const done = state.stepsCompleted[step.key]
              const current = i === activeStep
              return (
                <button
                  key={step.key}
                  onClick={() => setActiveStep(i)}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors
                    ${current ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}
                  `}
                >
                  <span
                    className={`
                      flex items-center justify-center w-6 h-6 rounded-full text-xs flex-shrink-0
                      ${done ? 'bg-teal-600 text-white' : current ? 'bg-teal-100 text-teal-700 ring-2 ring-teal-600' : 'bg-gray-200 text-gray-500'}
                    `}
                  >
                    {done ? '\u2713' : i + 1}
                  </span>
                  <span className="hidden md:inline">{step.label}</span>
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 md:p-10 max-w-3xl">
          <div className="mb-2 text-xs font-medium text-teal-600">
            Paso {activeStep + 1} de {totalSteps}
          </div>

          {/* Step content */}
          <div className="bg-white rounded-xl border shadow-sm p-6 md:p-8 mb-6">
            {activeStep === 0 && <StepConsultorio form={consultorio} onChange={setConsultorio} onSpecialtyApply={applySpecialtyTemplate} applyingTemplate={applyingTemplate} />}
            {activeStep === 1 && <StepHorarios form={horarios} onChange={setHorarios} />}
            {activeStep === 2 && <StepServicios form={servicios} onChange={setServicios} />}
            {activeStep === 3 && <StepGoogleCalendar />}
            {activeStep === 4 && <StepWhatsApp phone={whatsappPhone} onChange={setWhatsappPhone} />}
            {activeStep === 5 && <StepPortal consultorio={consultorio} />}
            {activeStep === 6 && (
              <StepVerificacion
                state={state}
                onPublish={publishAll}
                saving={saving}
              />
            )}
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between items-center">
            <button
              onClick={goBack}
              disabled={activeStep === 0}
              className="px-4 py-2 text-sm rounded-lg border text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Atras
            </button>

            {activeStep < totalSteps - 1 && (
              <button
                onClick={goNext}
                disabled={saving}
                className="px-6 py-2 text-sm rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Siguiente'}
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

/* ================================================================== */
/*  Step 1 — Tu consultorio                                            */
/* ================================================================== */

function StepConsultorio({
  form,
  onChange,
  onSpecialtyApply,
  applyingTemplate,
}: {
  form: ConsultorioForm
  onChange: (f: ConsultorioForm) => void
  onSpecialtyApply: (specialtyId: string) => void
  applyingTemplate: boolean
}) {
  const set = (key: keyof ConsultorioForm, val: string) =>
    onChange({ ...form, [key]: val })

  const isKnownSpecialty = SPECIALTY_OPTIONS.some((s) => s.id === form.specialty)
  const showCustomInput = form.specialty === 'otra'

  const handleSpecialtyChange = (value: string) => {
    set('specialty', value)
    if (value && value !== 'otra') {
      onSpecialtyApply(value)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900">Tu consultorio</h3>
        <p className="text-sm text-gray-500 mt-1">Informacion basica de tu practica medica.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Nombre del consultorio" value={form.businessName} onChange={(v) => set('businessName', v)} placeholder="Ej: Consultorio Dra. Martinez" />

        {/* Specialty dropdown */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Especialidad</label>
          <select
            value={isKnownSpecialty || showCustomInput ? form.specialty : ''}
            onChange={(e) => handleSpecialtyChange(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
          >
            <option value="">Seleccione su especialidad...</option>
            {SPECIALTY_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
            ))}
            <option value="otra">Otra especialidad</option>
          </select>
          {showCustomInput && (
            <input
              type="text"
              placeholder="Escriba su especialidad"
              value={form.customSpecialty || ''}
              onChange={(e) => onChange({ ...form, customSpecialty: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
            />
          )}
          {applyingTemplate && (
            <p className="text-xs text-teal-600 mt-1 animate-pulse">Configurando template...</p>
          )}
        </div>

        <Field label="Direccion" value={form.address} onChange={(v) => set('address', v)} placeholder="Calle, Colonia, Ciudad" className="md:col-span-2" />
        <Field label="Telefono" value={form.phone} onChange={(v) => set('phone', v)} placeholder="+52 55 1234 5678" />
      </div>

      {/* Logo placeholder */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-400 text-sm">
          Arrastra tu logo aqui o haz clic para seleccionar
          <br />
          <span className="text-xs">(Proximamente)</span>
        </div>
      </div>

      {/* Color pickers */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Colores de marca</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ColorPicker
            label="Color primario"
            value={form.primaryColor}
            onChange={(v) => set('primaryColor', v)}
          />
          <ColorPicker
            label="Color secundario"
            value={form.secondaryColor}
            onChange={(v) => set('secondaryColor', v)}
          />
        </div>
      </div>
    </div>
  )
}

/* ================================================================== */
/*  Step 2 — Horarios                                                  */
/* ================================================================== */

function StepHorarios({
  form,
  onChange,
}: {
  form: HorariosForm
  onChange: (f: HorariosForm) => void
}) {
  const toggleDay = (day: string) => {
    onChange({
      ...form,
      days: {
        ...form.days,
        [day]: { ...form.days[day], enabled: !form.days[day].enabled },
      },
    })
  }

  const setTime = (day: string, field: 'start' | 'end', val: string) => {
    onChange({
      ...form,
      days: {
        ...form.days,
        [day]: { ...form.days[day], [field]: val },
      },
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900">Horarios de atencion</h3>
        <p className="text-sm text-gray-500 mt-1">Define los dias y horas en que atiendes consultas.</p>
      </div>

      <div className="space-y-3">
        {DAY_LABELS.map((day) => {
          const d = form.days[day]
          return (
            <div key={day} className="flex items-center gap-3 py-2">
              <button
                type="button"
                onClick={() => toggleDay(day)}
                className={`
                  w-10 h-6 rounded-full transition-colors relative flex-shrink-0
                  ${d.enabled ? 'bg-teal-600' : 'bg-gray-300'}
                `}
              >
                <span
                  className={`
                    absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform
                    ${d.enabled ? 'left-[18px]' : 'left-0.5'}
                  `}
                />
              </button>
              <span className={`w-24 text-sm ${d.enabled ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                {day}
              </span>
              {d.enabled && (
                <div className="flex items-center gap-2 text-sm">
                  <input
                    type="time"
                    value={d.start}
                    onChange={(e) => setTime(day, 'start', e.target.value)}
                    className="border rounded px-2 py-1 text-gray-700"
                  />
                  <span className="text-gray-400">a</span>
                  <input
                    type="time"
                    value={d.end}
                    onChange={(e) => setTime(day, 'end', e.target.value)}
                    className="border rounded px-2 py-1 text-gray-700"
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Duracion de consulta
        </label>
        <div className="flex flex-wrap gap-2">
          {DURATION_OPTIONS.map((min) => (
            <button
              key={min}
              type="button"
              onClick={() => onChange({ ...form, duration: min })}
              className={`
                px-4 py-2 rounded-lg text-sm border transition-colors
                ${form.duration === min ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}
              `}
            >
              {min} min
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ================================================================== */
/*  Step 3 — Servicios                                                 */
/* ================================================================== */

function StepServicios({
  form,
  onChange,
}: {
  form: ServiciosForm
  onChange: (f: ServiciosForm) => void
}) {
  const addRow = () => {
    onChange({
      services: [...form.services, { name: '', price: '', duration: '30' }],
    })
  }

  const removeRow = (idx: number) => {
    if (form.services.length <= 1) return
    onChange({ services: form.services.filter((_, i) => i !== idx) })
  }

  const updateRow = (idx: number, key: keyof ServiceRow, val: string) => {
    const next = [...form.services]
    next[idx] = { ...next[idx], [key]: val }
    onChange({ services: next })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900">Servicios</h3>
        <p className="text-sm text-gray-500 mt-1">
          Agrega los servicios que ofreces. Puedes agregar mas despues.
        </p>
      </div>

      <div className="space-y-3">
        {form.services.map((svc, i) => (
          <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Nombre del servicio"
                value={svc.name}
                onChange={(e) => updateRow(i, 'name', e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-full"
              />
              <input
                type="text"
                placeholder="Precio (MXN)"
                value={svc.price}
                onChange={(e) => updateRow(i, 'price', e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-full"
              />
              <input
                type="text"
                placeholder="Duracion (min)"
                value={svc.duration}
                onChange={(e) => updateRow(i, 'duration', e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-full"
              />
            </div>
            {form.services.length > 1 && (
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="text-gray-400 hover:text-red-500 mt-2 text-lg leading-none"
                title="Eliminar"
              >
                &times;
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="text-sm text-teal-600 hover:text-teal-700 font-medium"
      >
        + Agregar servicio
      </button>
    </div>
  )
}

/* ================================================================== */
/*  Step 4 — Google Calendar                                           */
/* ================================================================== */

function StepGoogleCalendar() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900">Google Calendar</h3>
        <p className="text-sm text-gray-500 mt-1">
          Sincroniza tu agenda de Google para evitar citas duplicadas.
        </p>
      </div>

      <div className="bg-gray-50 rounded-xl p-6 text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
          <svg className="w-8 h-8 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <p className="text-sm text-gray-600">
          Conecta tu cuenta de Google para sincronizar automaticamente las citas con tu calendario.
        </p>
        <a
          href="/integrations"
          className="inline-block px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Conectar Google Calendar
        </a>
        <p className="text-xs text-gray-400">Puedes configurar esto despues en Integraciones.</p>
      </div>
    </div>
  )
}

/* ================================================================== */
/*  Step 5 — WhatsApp                                                  */
/* ================================================================== */

function StepWhatsApp({
  phone,
  onChange,
}: {
  phone: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900">WhatsApp Business</h3>
        <p className="text-sm text-gray-500 mt-1">
          Configura el canal de WhatsApp para que tus pacientes agenden y reciban recordatorios.
        </p>
      </div>

      <div className="bg-gray-50 rounded-xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.96 11.96 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.35 0-4.523-.744-6.305-2.01l-.44-.322-2.633.882.882-2.633-.322-.44A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">
              Nosotros lo configuramos por ti
            </h4>
            <p className="text-sm text-gray-500 mt-1">
              Necesitamos un numero de WhatsApp Business o un numero dedicado para configurar
              las notificaciones automaticas via Meta Business API. Nuestro equipo se encarga
              de la integracion completa.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Numero de WhatsApp
          </label>
          <input
            type="tel"
            placeholder="+52 55 1234 5678"
            value={phone}
            onChange={(e) => onChange(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">
            Nuestro equipo te contactara para finalizar la integracion.
          </p>
        </div>
      </div>
    </div>
  )
}

/* ================================================================== */
/*  Step 6 — Portal web                                                */
/* ================================================================== */

function StepPortal({ consultorio }: { consultorio: ConsultorioForm }) {
  const slug = (consultorio.businessName || 'mi-consultorio')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  // Resolve specialty display name from ID
  const specialtyDisplay = consultorio.specialty === 'otra'
    ? (consultorio.customSpecialty || 'Especialidad')
    : (SPECIALTY_OPTIONS.find((s) => s.id === consultorio.specialty)?.name || consultorio.specialty || 'Especialidad')

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900">Tu portal web</h3>
        <p className="text-sm text-gray-500 mt-1">
          Asi se vera tu pagina publica para que tus pacientes agenden en linea.
        </p>
      </div>

      {/* Preview card */}
      <div className="border rounded-xl overflow-hidden shadow-sm">
        <div
          className="h-32 flex items-end p-4"
          style={{ backgroundColor: consultorio.primaryColor || '#0D9488' }}
        >
          <div className="text-white">
            <h4 className="text-lg font-bold">
              {consultorio.businessName || 'Nombre del consultorio'}
            </h4>
            <p className="text-sm opacity-90">
              {specialtyDisplay}
            </p>
          </div>
        </div>
        <div className="p-4 space-y-2">
          <p className="text-sm text-gray-600">{consultorio.address || 'Direccion del consultorio'}</p>
          <p className="text-sm text-gray-600">{consultorio.phone || 'Telefono'}</p>
          <div className="pt-3">
            <div className="bg-teal-600 text-white text-center py-2 rounded-lg text-sm font-medium">
              Agendar cita
            </div>
          </div>
        </div>
      </div>

      {/* Subdomain */}
      <div className="bg-gray-50 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Tu subdominio</label>
        <div className="flex items-center gap-1 text-sm">
          <span className="text-gray-500">dr-</span>
          <span className="font-medium text-gray-900">{slug}</span>
          <span className="text-gray-500">.auctorum.com.mx</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Este sera el enlace publico de tu consultorio.
        </p>
      </div>
    </div>
  )
}

/* ================================================================== */
/*  Step 7 — Verificacion                                              */
/* ================================================================== */

function StepVerificacion({
  state,
  onPublish,
  saving,
}: {
  state: OnboardingState
  onPublish: () => void
  saving: boolean
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900">Verificacion</h3>
        <p className="text-sm text-gray-500 mt-1">
          Revisa que todo este configurado antes de publicar tu consultorio.
        </p>
      </div>

      <div className="space-y-2">
        {state.steps.map((step) => {
          const done = state.stepsCompleted[step.key]
          return (
            <div
              key={step.key}
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-50"
            >
              <span
                className={`
                  w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0
                  ${done ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}
                `}
              >
                {done ? '\u2713' : '\u2022'}
              </span>
              <div className="flex-1">
                <p className={`text-sm ${done ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                  {step.title}
                </p>
                <p className="text-xs text-gray-400">{step.description}</p>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  done ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {done ? 'Listo' : 'Pendiente'}
              </span>
            </div>
          )
        })}
      </div>

      <div className="pt-4 text-center">
        <button
          onClick={onPublish}
          disabled={saving}
          className="px-8 py-3 bg-green-600 text-white rounded-xl text-base font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 shadow-lg shadow-green-600/20"
        >
          {saving ? 'Publicando...' : 'Publicar mi consultorio'}
        </button>
        <p className="text-xs text-gray-400 mt-2">
          Puedes cambiar cualquier configuracion despues desde Ajustes.
        </p>
      </div>
    </div>
  )
}

/* ================================================================== */
/*  Shared UI components                                               */
/* ================================================================== */

function Field({
  label,
  value,
  onChange,
  placeholder,
  className = '',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
      />
    </div>
  )
}

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1.5">{label}</p>
      <div className="flex items-center gap-2">
        <div className="flex gap-1 flex-wrap">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              className={`w-7 h-7 rounded-full border-2 transition-transform ${
                value === c ? 'border-gray-900 scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-20 border rounded px-2 py-1 text-xs text-gray-700 font-mono"
          maxLength={7}
        />
      </div>
    </div>
  )
}
