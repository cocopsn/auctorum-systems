'use client'

import { useEffect, useMemo, useState, FormEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Loader2, Check, X } from 'lucide-react'
import { validateSlug, suggestSlug } from '@/lib/slug'

type TenantType = 'medical' | 'indus'
type Plan = 'basico' | 'auctorum' | 'enterprise'
type Prefix = 'dr' | 'dra' | 'doc'
type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

export default function SignupPage() {
  const [tenantType, setTenantType] = useState<TenantType>('medical')
  const [plan, setPlan] = useState<Plan>('auctorum')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [doctorName, setDoctorName] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [doctorTitlePrefix, setDoctorTitlePrefix] = useState<Prefix>('dra')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle')
  const [slugError, setSlugError] = useState('')
  const [resolvedSubdomain, setResolvedSubdomain] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ portalHost?: string; publicHost?: string } | null>(null)

  useEffect(() => {
    if (slugEdited) return
    setSlug(suggestSlug(businessName || doctorName || fullName))
  }, [businessName, doctorName, fullName, slugEdited])

  useEffect(() => {
    if (!slug) {
      setSlugStatus('idle')
      setSlugError('')
      setResolvedSubdomain(null)
      return
    }

    const clientError = validateSlug(slug)
    if (clientError) {
      setSlugStatus('invalid')
      setSlugError(clientError)
      setResolvedSubdomain(null)
      return
    }

    setSlugStatus('checking')
    setSlugError('')
    const timer = setTimeout(async () => {
      try {
        const qs = new URLSearchParams({
          slug,
          tenantType,
          prefix: doctorTitlePrefix,
        })
        const res = await fetch(`/api/signup/check-slug?${qs.toString()}`)
        const data = await res.json()
        if (data.available) {
          setSlugStatus('available')
          setSlugError('')
          setResolvedSubdomain(data.publicSubdomain ?? slug)
        } else {
          setSlugStatus('taken')
          setSlugError(data.error ?? 'No disponible')
          setResolvedSubdomain(null)
        }
      } catch {
        setSlugStatus('idle')
        setResolvedSubdomain(null)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [slug, tenantType, doctorTitlePrefix])

  const subdomainPreview = useMemo(() => {
    if (!slug) return null
    return tenantType === 'medical' ? `${doctorTitlePrefix}-${slug}.auctorum.com.mx` : null
  }, [doctorTitlePrefix, slug, tenantType])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (slugStatus !== 'available') {
      setError('Resuelva el subdominio antes de continuar')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          fullName,
          businessName,
          slug,
          tenantType,
          plan,
          doctorTitlePrefix: tenantType === 'medical' ? doctorTitlePrefix : undefined,
          doctorName: tenantType === 'medical' ? (doctorName || fullName) : undefined,
          specialty: tenantType === 'medical' ? specialty : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Error al crear la cuenta')
        return
      }
      setResult(data)
      setSubmitted(true)
    } catch {
      setError('Error de conexion. Intente de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit =
    fullName &&
    email &&
    businessName &&
    slug &&
    slugStatus === 'available' &&
    (!tenantType || tenantType === 'indus' || specialty) &&
    !submitting

  const inputCls =
    'w-full px-3.5 py-2.5 rounded-lg border border-slate-700 bg-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors'

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-6 py-10">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="Auctorum" width={120} height={120} className="mx-auto mb-4 h-16 w-auto" />
          <h1 className="text-xl font-semibold text-white">Crear cuenta en Auctorum</h1>
          <p className="text-sm text-slate-400 mt-1">Portal unificado + onboarding guiado + subdominio medico automatizado</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8">
          {submitted ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-emerald-600/20 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-6 h-6 text-emerald-400" />
              </div>
              <h2 className="text-base font-semibold text-white">Cuenta creada</h2>
              <p className="text-sm text-slate-400">
                Enviamos un magic link a <span className="font-medium text-white">{email}</span>.
              </p>
              <div className="text-sm text-slate-300 bg-slate-950 rounded-xl p-4 text-left space-y-2">
                <p>Portal de gestion: <code className="text-blue-300">{result?.portalHost}</code></p>
                {result?.publicHost && <p>Landing publica: <code className="text-emerald-300">{result.publicHost}</code></p>}
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-800 p-4">
                  <p className="text-sm font-medium text-white mb-3">Tipo de cuenta</p>
                  <div className="grid gap-2">
                    <button type="button" onClick={() => setTenantType('medical')} className={`rounded-lg border px-3 py-3 text-left ${tenantType === 'medical' ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-slate-700 text-slate-400'}`}>
                      <span className="block text-sm font-medium">Medico</span>
                      <span className="block text-xs mt-1">Portal publico, agenda, WhatsApp, onboarding medico</span>
                    </button>
                    <button type="button" onClick={() => setTenantType('indus')} className={`rounded-lg border px-3 py-3 text-left ${tenantType === 'indus' ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-slate-700 text-slate-400'}`}>
                      <span className="block text-sm font-medium">Indus</span>
                      <span className="block text-xs mt-1">Opera dentro de portal.auctorum.com.mx en v1</span>
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 p-4">
                  <p className="text-sm font-medium text-white mb-3">Plan inicial</p>
                  <div className="grid gap-2">
                    {[
                      { key: 'basico', label: 'Básico', price: '$1,400' },
                      { key: 'auctorum', label: 'Pro', price: '$1,800 MXN' },
                      { key: 'enterprise', label: 'Enterprise', price: 'Contactar' },
                    ].map((option) => (
                      <button key={option.key} type="button" onClick={() => setPlan(option.key as Plan)} className={`rounded-lg border px-3 py-3 text-left ${plan === option.key ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-slate-700 text-slate-400'}`}>
                        <span className="block text-sm font-medium">{option.label}</span>
                        <span className="block text-xs mt-1">{option.price}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Nombre completo</label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={120} placeholder="Armando Perez" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Correo electronico</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} placeholder="doctor@correo.com" className={inputCls} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Nombre del negocio</label>
                  <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required maxLength={255} placeholder={tenantType === 'medical' ? 'Clinica Dra. Martinez' : 'Grupo Indus Norte'} className={inputCls} />
                </div>
                {tenantType === 'medical' ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Especialidad</label>
                    <input type="text" value={specialty} onChange={(e) => setSpecialty(e.target.value)} required maxLength={255} placeholder="Cardiologia" className={inputCls} />
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-400">
                    El tenant indus usara el portal unificado y no generara landing publica propia en v1.
                  </div>
                )}
              </div>

              {tenantType === 'medical' && (
                <div className="grid gap-4 md:grid-cols-[140px_1fr]">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Prefijo publico</label>
                    <select value={doctorTitlePrefix} onChange={(e) => setDoctorTitlePrefix(e.target.value as Prefix)} className={inputCls}>
                      <option value="dr">dr</option>
                      <option value="dra">dra</option>
                      <option value="doc">doc</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Nombre del doctor</label>
                    <input type="text" value={doctorName} onChange={(e) => setDoctorName(e.target.value)} maxLength={255} placeholder="Dra. Sofia Martinez" className={inputCls} />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  {tenantType === 'medical' ? 'Slug base para el subdominio' : 'Slug del tenant'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => {
                      setSlug(e.target.value.toLowerCase())
                      setSlugEdited(true)
                    }}
                    required
                    maxLength={63}
                    placeholder="martinez-cardio"
                    className={inputCls + ' pr-44'}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 pointer-events-none">
                    {tenantType === 'medical' ? `${doctorTitlePrefix}-*.auctorum.com.mx` : '.auctorum.com.mx'}
                  </span>
                </div>
                <div className="mt-1 h-4 text-xs flex items-center gap-1">
                  {slugStatus === 'checking' && <span className="text-slate-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Verificando...</span>}
                  {slugStatus === 'available' && <span className="text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3" /> Disponible</span>}
                  {(slugStatus === 'taken' || slugStatus === 'invalid') && <span className="text-red-400 flex items-center gap-1"><X className="w-3 h-3" /> {slugError}</span>}
                </div>
                {tenantType === 'medical' && subdomainPreview && (
                  <p className="mt-2 text-xs text-slate-500">
                    Vista previa publica: <code className="text-slate-300">{resolvedSubdomain ? `${resolvedSubdomain}.auctorum.com.mx` : subdomainPreview}</code>
                  </p>
                )}
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <button type="submit" disabled={!canSubmit} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 px-4 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Crear cuenta y abrir onboarding
              </button>

              <p className="text-xs text-slate-500 text-center pt-1">
                El acceso posterior se centraliza en <code className="text-slate-300">portal.auctorum.com.mx</code>.
              </p>

              <p className="text-xs text-slate-500 text-center">
                Ya tienes cuenta? <Link href="/login" className="text-blue-400 hover:text-blue-300">Iniciar sesion</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
