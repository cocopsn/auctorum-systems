'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TenantType = 'medical' | 'industrial'
type PlanKey = 'basico' | 'auctorum' | 'enterprise'
type DoctorPrefix = 'dr' | 'dra' | 'doc'
type SlugStatus = 'idle' | 'checking' | 'available' | 'taken'

interface FormData {
  tenantType: TenantType | ''
  fullName: string
  email: string
  phone: string
  businessName: string
  specialty: string
  city: string
  doctorTitlePrefix: DoctorPrefix
  slug: string
  plan: PlanKey | ''
}

// ---------------------------------------------------------------------------
// Plan definitions
// ---------------------------------------------------------------------------

const PLANS: {
  key: PlanKey
  name: string
  price: string
  priceNote: string
  features: string[]
  cta: string
  highlight?: boolean
}[] = [
  {
    key: 'basico',
    name: 'Basico',
    price: '$1,400',
    priceNote: '/mes MXN',
    features: [
      'Chatbot WhatsApp IA',
      'Agenda automatizada',
      'Recordatorios 24h + 1h',
      'Landing personalizada',
      'Portal pacientes',
      '200 msgs/mes',
    ],
    cta: 'Comenzar',
  },
  {
    key: 'auctorum',
    name: 'Auctorum',
    price: '$1,800',
    priceNote: '/mes MXN',
    features: [
      'Todo del Plan Basico',
      'Expedientes clinicos',
      'Campanas WhatsApp',
      'Dashboard personalizable',
      'Google Calendar',
      'Soporte prioritario',
      '1,000 msgs/mes',
    ],
    cta: 'Comenzar',
    highlight: true,
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: 'Cotizar',
    priceNote: '',
    features: [
      'Todo del Plan Auctorum',
      'Multi-sucursal',
      'API personalizada',
      'Onboarding dedicado',
      'SLA garantizado',
      'Mensajes ilimitados',
    ],
    cta: 'Contactanos',
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalize a string into a URL-safe slug */
function toSlug(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')   // remove invalid chars
    .trim()
    .replace(/\s+/g, '-')           // spaces to hyphens
    .replace(/-+/g, '-')            // collapse multiple hyphens
    .replace(/^-|-$/g, '')          // trim leading/trailing hyphens
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SignupPage() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<FormData>({
    tenantType: '',
    fullName: '',
    email: '',
    phone: '',
    businessName: '',
    specialty: '',
    city: '',
    doctorTitlePrefix: 'dr',
    slug: '',
    plan: '',
  })
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle')
  const [slugSuggestion, setSlugSuggestion] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ---- Field updater ------------------------------------------------------
  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setApiError('')
  }

  // ---- Auto-generate slug from businessName -------------------------------
  useEffect(() => {
    const raw = toSlug(formData.businessName)
    if (raw !== formData.slug) {
      updateField('slug', raw)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.businessName])

  // ---- Build full slug (with prefix for medical) --------------------------
  const fullSlug =
    formData.tenantType === 'medical' && formData.slug
      ? `${formData.doctorTitlePrefix}-${formData.slug}`
      : formData.slug

  // ---- Debounced slug availability check ----------------------------------
  const checkSlug = useCallback(async (slug: string) => {
    if (!slug || slug.length < 3) {
      setSlugStatus('idle')
      return
    }
    setSlugStatus('checking')
    setSlugSuggestion('')
    try {
      const res = await fetch(`/api/signup/check-slug?slug=${encodeURIComponent(slug)}`)
      const json = await res.json()
      if (json.available) {
        setSlugStatus('available')
      } else {
        setSlugStatus('taken')
        if (json.suggestion) setSlugSuggestion(json.suggestion)
      }
    } catch {
      setSlugStatus('idle')
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!fullSlug || fullSlug.length < 3) {
      setSlugStatus('idle')
      return
    }
    debounceRef.current = setTimeout(() => {
      checkSlug(fullSlug)
    }, 500)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [fullSlug, checkSlug])

  // ---- Step 2 validation --------------------------------------------------
  function validateStep2(): boolean {
    const errs: Record<string, string> = {}
    if (!formData.fullName.trim()) errs.fullName = 'Nombre requerido'
    if (!formData.email.trim()) errs.email = 'Correo requerido'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      errs.email = 'Correo invalido'
    if (!formData.businessName.trim())
      errs.businessName = 'Nombre del negocio requerido'
    if (!formData.slug || formData.slug.length < 3)
      errs.slug = 'Slug muy corto (min 3 caracteres)'
    if (formData.tenantType === 'medical' && !formData.specialty?.trim())
      errs.specialty = 'Especialidad requerida'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ---- Submit signup ------------------------------------------------------
  async function handleSelectPlan(plan: PlanKey, processor: 'mercadopago' | 'stripe' = 'mercadopago') {
    if (!acceptedTerms) {
      setApiError('Debes aceptar los Términos y el Aviso de Privacidad para continuar.')
      return
    }
    if (plan === 'enterprise') {
      updateField('plan', 'enterprise')
      setSubmitting(true)
      setApiError('')
      try {
        const res = await fetch('/api/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...formData, plan: 'enterprise', slug: formData.slug, acceptedTerms: true, processor }),
        })
        const json = await res.json()
        if (!res.ok) {
          setApiError(json.error || 'Error al registrar')
          setSubmitting(false)
          return
        }
        setShowSuccess(true)
      } catch {
        setApiError('Error de conexion. Intenta de nuevo.')
      }
      setSubmitting(false)
      return
    }

    // Paid plan: submit and redirect to MercadoPago (or Stripe if user chose so)
    updateField('plan', plan)
    setSubmitting(true)
    setApiError('')
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, plan, slug: formData.slug, acceptedTerms: true, processor }),
      })
      const json = await res.json()
      if (!res.ok && !json.ok) {
        setApiError(json.error || 'Error al registrar')
        setSubmitting(false)
        return
      }
      if (json.checkoutUrl) {
        window.location.href = json.checkoutUrl
        return
      }
      if (json.redirect) {
        window.location.href = json.redirect
        return
      }
    } catch {
      setApiError('Error de conexion. Intenta de nuevo.')
    }
    setSubmitting(false)
  }

  // ---- Success screen -----------------------------------------------------
  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary px-4">
        <div className="max-w-md w-full text-center animate-fade-in">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-sora font-semibold text-text-primary mb-3">
            Registro exitoso
          </h1>
          <p className="text-text-secondary mb-6">
            Hemos recibido tu solicitud. Nuestro equipo se pondra en contacto contigo
            para configurar tu plan Enterprise.
          </p>
          <a
            href="/login"
            className="inline-block px-6 py-3 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover transition-colors"
          >
            Ir a Iniciar Sesion
          </a>
        </div>
      </div>
    )
  }

  // ---- Step indicator -----------------------------------------------------
  function StepIndicator() {
    const steps = [
      { num: 1, label: 'Tipo de Cuenta' },
      { num: 2, label: 'Informacion' },
      { num: 3, label: 'Plan' },
    ]
    return (
      <div className="flex items-center justify-center gap-2 mb-10">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center gap-2">
            <div
              className={`
                w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300
                ${
                  step === s.num
                    ? 'bg-accent text-white shadow-md shadow-accent/25'
                    : step > s.num
                      ? 'bg-accent/15 text-accent'
                      : 'bg-bg-tertiary text-text-tertiary'
                }
              `}
            >
              {step > s.num ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                s.num
              )}
            </div>
            <span
              className={`text-sm hidden sm:inline transition-colors ${
                step === s.num ? 'text-text-primary font-medium' : 'text-text-tertiary'
              }`}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div
                className={`w-10 h-0.5 mx-1 rounded transition-colors ${
                  step > s.num ? 'bg-accent/40' : 'bg-bg-tertiary'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    )
  }

  // ---- Step 1: Account Type -----------------------------------------------
  function Step1() {
    const options: { type: TenantType; title: string; desc: string; icon: JSX.Element }[] = [
      {
        type: 'medical',
        title: 'Consultorio Medico',
        desc: 'Agenda, chatbot WhatsApp, expedientes, portal de pacientes',
        icon: (
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5"
            />
          </svg>
        ),
      },
      {
        type: 'industrial',
        title: 'Negocio / Industrial',
        desc: 'Cotizaciones, CRM, chatbot, facturacion, portal de clientes',
        icon: (
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
            />
          </svg>
        ),
      },
    ]

    return (
      <div className="animate-fade-in">
        <h2 className="text-xl font-sora font-semibold text-text-primary text-center mb-2">
          Tipo de Cuenta
        </h2>
        <p className="text-text-secondary text-center mb-8">
          Selecciona el tipo de cuenta que mejor se adapte a tu negocio
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {options.map((opt) => (
            <button
              key={opt.type}
              type="button"
              onClick={() => {
                updateField('tenantType', opt.type)
                setStep(2)
              }}
              className={`
                group relative p-6 rounded-xl border-2 text-left transition-all duration-200
                hover:border-accent hover:shadow-lg hover:shadow-accent/5
                ${
                  formData.tenantType === opt.type
                    ? 'border-accent bg-accent-muted'
                    : 'border-border bg-bg-secondary'
                }
              `}
            >
              <div className={`
                w-12 h-12 rounded-lg flex items-center justify-center mb-4 transition-colors
                ${formData.tenantType === opt.type
                  ? 'bg-accent text-white'
                  : 'bg-bg-tertiary text-text-secondary group-hover:bg-accent/10 group-hover:text-accent'}
              `}>
                {opt.icon}
              </div>
              <h3 className="text-lg font-sora font-medium text-text-primary mb-1">
                {opt.title}
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                {opt.desc}
              </p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ---- Step 2: Basic Info -------------------------------------------------
  function Step2() {
    const isMedical = formData.tenantType === 'medical'

    return (
      <div className="animate-fade-in">
        <h2 className="text-xl font-sora font-semibold text-text-primary text-center mb-2">
          Informacion Basica
        </h2>
        <p className="text-text-secondary text-center mb-8">
          Datos de tu cuenta y negocio
        </p>

        <div className="space-y-5">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Nombre completo *
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => updateField('fullName', e.target.value)}
              placeholder="Dr. Juan Perez"
              className={`w-full px-4 py-2.5 rounded-lg border bg-bg-secondary text-text-primary placeholder:text-text-tertiary
                focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all
                ${errors.fullName ? 'border-error' : 'border-border'}`}
            />
            {errors.fullName && <p className="text-error text-xs mt-1">{errors.fullName}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Correo electronico *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="juan@consultorio.com"
              className={`w-full px-4 py-2.5 rounded-lg border bg-bg-secondary text-text-primary placeholder:text-text-tertiary
                focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all
                ${errors.email ? 'border-error' : 'border-border'}`}
            />
            {errors.email && <p className="text-error text-xs mt-1">{errors.email}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Telefono
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="+52 614 123 4567"
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-bg-secondary text-text-primary placeholder:text-text-tertiary
                focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
            />
          </div>

          {/* Business Name */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              {isMedical ? 'Nombre del consultorio *' : 'Nombre del negocio *'}
            </label>
            <input
              type="text"
              value={formData.businessName}
              onChange={(e) => updateField('businessName', e.target.value)}
              placeholder={isMedical ? 'Consultorio Dental Sonrisa' : 'Mi Empresa SA'}
              className={`w-full px-4 py-2.5 rounded-lg border bg-bg-secondary text-text-primary placeholder:text-text-tertiary
                focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all
                ${errors.businessName ? 'border-error' : 'border-border'}`}
            />
            {errors.businessName && <p className="text-error text-xs mt-1">{errors.businessName}</p>}
          </div>

          {/* Specialty (medical only) */}
          {isMedical && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Especialidad *
              </label>
              <input
                type="text"
                value={formData.specialty}
                onChange={(e) => updateField('specialty', e.target.value)}
                placeholder="Odontologia, Dermatologia, etc."
                className={`w-full px-4 py-2.5 rounded-lg border bg-bg-secondary text-text-primary placeholder:text-text-tertiary
                  focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all
                  ${errors.specialty ? 'border-error' : 'border-border'}`}
              />
              {errors.specialty && <p className="text-error text-xs mt-1">{errors.specialty}</p>}
            </div>
          )}

          {/* City */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Ciudad
            </label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => updateField('city', e.target.value)}
              placeholder="Chihuahua, CDMX, Guadalajara..."
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-bg-secondary text-text-primary placeholder:text-text-tertiary
                focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
            />
          </div>

          {/* Doctor Title Prefix (medical only) */}
          {isMedical && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Prefijo del titulo
              </label>
              <div className="flex gap-3">
                {(['dr', 'dra', 'doc'] as DoctorPrefix[]).map((prefix) => (
                  <button
                    key={prefix}
                    type="button"
                    onClick={() => updateField('doctorTitlePrefix', prefix)}
                    className={`
                      px-4 py-2 rounded-lg border text-sm font-medium transition-all
                      ${
                        formData.doctorTitlePrefix === prefix
                          ? 'border-accent bg-accent text-white'
                          : 'border-border bg-bg-secondary text-text-secondary hover:border-accent/50'
                      }
                    `}
                  >
                    {prefix === 'dr' ? 'Dr.' : prefix === 'dra' ? 'Dra.' : 'Doc.'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Slug preview */}
          {/*
            Pre-2026-05-10 the prefix said "portal.auctorum.com.mx/" for
            both tenant types. Medical tenants live at
            <slug>.auctorum.com.mx (subdomain), B2B at portal.auctorum.com.mx/<slug>.
            The mismatch made doctors expect a path URL and confuse them
            after signup. Now we render the right prefix per type.
          */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              URL de tu portal
            </label>
            <div className="flex items-center gap-0">
              <span className="px-3 py-2.5 bg-bg-tertiary border border-r-0 border-border rounded-l-lg text-sm text-text-tertiary whitespace-nowrap">
                {formData.tenantType === 'medical'
                  ? 'https://'
                  : 'portal.auctorum.com.mx/'}
              </span>
              <input
                type="text"
                value={
                  formData.tenantType === 'medical'
                    ? `${fullSlug}.auctorum.com.mx`
                    : fullSlug
                }
                readOnly
                className="flex-1 px-3 py-2.5 border border-border rounded-r-lg bg-bg-secondary text-text-primary text-sm
                  focus:outline-none"
              />
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 min-h-[20px]">
              {slugStatus === 'checking' && (
                <>
                  <div className="w-3 h-3 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                  <span className="text-xs text-text-tertiary">Verificando disponibilidad...</span>
                </>
              )}
              {slugStatus === 'available' && (
                <>
                  <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-xs text-success">Disponible</span>
                </>
              )}
              {slugStatus === 'taken' && (
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-xs text-error">No disponible</span>
                  </div>
                  {slugSuggestion && (
                    <button
                      type="button"
                      onClick={() => {
                        // Extract just the base part (remove prefix if present)
                        const prefix = formData.doctorTitlePrefix + '-'
                        const base = slugSuggestion.startsWith(prefix)
                          ? slugSuggestion.slice(prefix.length)
                          : slugSuggestion
                        updateField('slug', base)
                      }}
                      className="text-xs text-accent hover:underline mt-0.5 text-left"
                    >
                      Sugerencia: {slugSuggestion}
                    </button>
                  )}
                </div>
              )}
            </div>
            {errors.slug && <p className="text-error text-xs mt-1">{errors.slug}</p>}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="px-5 py-2.5 rounded-lg border border-border text-text-secondary text-sm font-medium
              hover:bg-bg-tertiary transition-colors"
          >
            Atras
          </button>
          <button
            type="button"
            onClick={() => {
              if (validateStep2()) setStep(3)
            }}
            className="px-6 py-2.5 rounded-lg bg-accent text-white text-sm font-medium
              hover:bg-accent-hover transition-colors shadow-sm"
          >
            Siguiente
          </button>
        </div>
      </div>
    )
  }

  // ---- Step 3: Choose Plan ------------------------------------------------
  function Step3() {
    return (
      <div className="animate-fade-in">
        <h2 className="text-xl font-sora font-semibold text-text-primary text-center mb-2">
          Elige tu Plan
        </h2>
        <p className="text-text-secondary text-center mb-8">
          Todos los planes incluyen 14 dias de prueba gratis
        </p>

        {apiError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-error">{apiError}</p>
          </div>
        )}

        {/* Terms acceptance — required for adhesion contract validity (Art. 1803 CCF) */}
        <div className="mb-6 rounded-lg border border-border bg-bg-secondary p-4">
          <label className="flex items-start gap-3 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border text-accent focus:ring-2 focus:ring-accent"
              aria-label="Aceptar Términos y Condiciones"
            />
            <span className="text-text-secondary">
              He leído y acepto los{' '}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-accent underline">
                Términos y Condiciones
              </a>
              , el{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-accent underline">
                Aviso de Privacidad
              </a>{' '}
              y la{' '}
              <a href="/ai-policy" target="_blank" rel="noopener noreferrer" className="text-accent underline">
                Política de IA
              </a>
              . Entiendo que mi pago constituye aceptación de este contrato de adhesión digital.
            </span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((plan) => (
            <div
              key={plan.key}
              className={`
                relative rounded-xl border-2 p-6 flex flex-col transition-all
                ${
                  plan.highlight
                    ? 'border-accent shadow-lg shadow-accent/10'
                    : 'border-border'
                }
              `}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 bg-accent text-white text-xs font-medium rounded-full">
                    Recomendado
                  </span>
                </div>
              )}
              <h3 className="text-lg font-sora font-semibold text-text-primary mb-1">
                {plan.name}
              </h3>
              <div className="mb-4">
                <span className="text-2xl font-sora font-bold text-text-primary">
                  {plan.price}
                </span>
                {plan.priceNote && (
                  <span className="text-sm text-text-tertiary">{plan.priceNote}</span>
                )}
              </div>
              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map((feat, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                    <svg
                      className="w-4 h-4 text-success mt-0.5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {feat}
                  </li>
                ))}
              </ul>
              {plan.key === 'enterprise' ? (
                <button
                  type="button"
                  disabled={submitting || !acceptedTerms}
                  onClick={() => handleSelectPlan(plan.key)}
                  className="w-full py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed border-2 border-border text-text-primary hover:border-accent hover:text-accent"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                      Procesando...
                    </span>
                  ) : (
                    plan.cta
                  )}
                </button>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={submitting || !acceptedTerms}
                    onClick={() => handleSelectPlan(plan.key, 'mercadopago')}
                    className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      plan.highlight
                        ? 'bg-accent text-white hover:bg-accent-hover shadow-sm'
                        : 'bg-bg-tertiary text-text-primary hover:bg-accent/10 hover:text-accent'
                    }`}
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                        Procesando...
                      </span>
                    ) : (
                      'Pagar con MercadoPago'
                    )}
                  </button>
                  <p className="text-center text-[10px] text-text-tertiary">
                    Tarjeta · OXXO · SPEI · MercadoPago
                  </p>
                  <button
                    type="button"
                    disabled={submitting || !acceptedTerms}
                    onClick={() => handleSelectPlan(plan.key, 'stripe')}
                    className="w-full py-2 rounded-lg text-xs font-medium border border-border text-text-secondary hover:border-accent hover:text-accent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Pagar con tarjeta internacional (Stripe)
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Back button */}
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => setStep(2)}
            disabled={submitting}
            className="px-5 py-2.5 rounded-lg border border-border text-text-secondary text-sm font-medium
              hover:bg-bg-tertiary transition-colors disabled:opacity-50"
          >
            Atras
          </button>
        </div>
      </div>
    )
  }

  // ---- Render -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center px-4 py-10">
      {/* Logo / Brand */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-sora font-bold text-text-primary">
          Auctorum
        </h1>
        <p className="text-sm text-text-tertiary mt-1">Crea tu cuenta</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-2xl">
        <StepIndicator />
        <div className="bg-bg-secondary rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
          {step === 1 && <Step1 />}
          {step === 2 && <Step2 />}
          {step === 3 && <Step3 />}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-text-tertiary mt-6">
          Al registrarte aceptas nuestros{' '}
          <a href="/terminos" className="text-accent hover:underline">
            Terminos de Servicio
          </a>{' '}
          y{' '}
          <a href="/privacidad" className="text-accent hover:underline">
            Politica de Privacidad
          </a>
          .
        </p>
        <p className="text-center text-xs text-text-tertiary mt-2">
          Ya tienes cuenta?{' '}
          <a href="/login" className="text-accent hover:underline font-medium">
            Inicia Sesion
          </a>
        </p>
      </div>
    </div>
  )
}
