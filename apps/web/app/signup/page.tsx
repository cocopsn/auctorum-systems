'use client'

import { useState, useEffect, FormEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Loader2, Check, X } from 'lucide-react'
import { validateSlug, suggestSlug } from '@/lib/slug'

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle')
  const [slugError, setSlugError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  // Auto-suggest slug from businessName (unless user manually edited it)
  useEffect(() => {
    if (slugEdited) return
    setSlug(suggestSlug(businessName))
  }, [businessName, slugEdited])

  // Debounced slug availability check
  useEffect(() => {
    if (!slug) {
      setSlugStatus('idle')
      setSlugError('')
      return
    }
    const clientError = validateSlug(slug)
    if (clientError) {
      setSlugStatus('invalid')
      setSlugError(clientError)
      return
    }
    setSlugStatus('checking')
    setSlugError('')
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/signup/check-slug?slug=${encodeURIComponent(slug)}`)
        const data = await res.json()
        if (data.available) {
          setSlugStatus('available')
          setSlugError('')
        } else {
          setSlugStatus('taken')
          setSlugError(data.error ?? 'No disponible')
        }
      } catch {
        setSlugStatus('idle')
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [slug])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (slugStatus !== 'available') {
      setError('Resuelva el error de subdominio antes de continuar')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, fullName, businessName, slug }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Error al crear la cuenta')
        return
      }
      setSubmitted(true)
    } catch {
      setError('Error de conexión. Intente de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit =
    fullName && email && businessName && slug && slugStatus === 'available' && !submitting

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col justify-center items-center px-6 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image
            src="/AUCTORUMMORADO.png"
            alt="Auctorum"
            width={48}
            height={48}
            className="mx-auto mb-4"
          />
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Crear cuenta</h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">
            Auctorum Systems — Motor de Cotizaciones B2B
          </p>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-8">
          {submitted ? (
            <div className="text-center">
              <div className="w-12 h-12 bg-[var(--success)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-6 h-6 text-[var(--success)]" />
              </div>
              <h2 className="text-base font-semibold text-[var(--text-primary)] mb-2">
                ¡Cuenta creada!
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Le hemos enviado un enlace de acceso a{' '}
                <span className="font-medium text-[var(--text-primary)]">{email}</span>.
              </p>
              <p className="text-xs text-[var(--text-tertiary)] mt-4">
                Su subdominio: <code className="font-mono">{slug}.auctorum.com.mx</code>
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="space-y-4">
              <Field label="Su nombre completo">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  maxLength={120}
                  placeholder="Juan Pérez"
                  className={inputCls}
                />
              </Field>

              <Field label="Correo electrónico">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  maxLength={255}
                  placeholder="juan@empresa.com"
                  autoComplete="email"
                  className={inputCls}
                />
              </Field>

              <Field label="Nombre del negocio">
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                  maxLength={255}
                  placeholder="Grupo Industrial Ejemplo"
                  className={inputCls}
                />
              </Field>

              <Field label="Subdominio">
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
                    placeholder="miempresa"
                    className={inputCls + ' pr-36'}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-tertiary)] pointer-events-none">
                    .auctorum.com.mx
                  </span>
                </div>
                <div className="mt-1 h-4 text-xs flex items-center gap-1">
                  {slugStatus === 'checking' && (
                    <span className="text-[var(--text-tertiary)] flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Verificando…
                    </span>
                  )}
                  {slugStatus === 'available' && (
                    <span className="text-[var(--success)] flex items-center gap-1">
                      <Check className="w-3 h-3" /> Disponible
                    </span>
                  )}
                  {(slugStatus === 'taken' || slugStatus === 'invalid') && (
                    <span className="text-[var(--error)] flex items-center gap-1">
                      <X className="w-3 h-3" /> {slugError}
                    </span>
                  )}
                </div>
              </Field>

              {error && <p className="text-sm text-[var(--error)]">{error}</p>}

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full bg-[var(--accent)] text-white font-medium py-2.5 px-4 rounded-lg text-sm hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Crear cuenta
              </button>

              <p className="text-xs text-[var(--text-tertiary)] text-center pt-2">
                ¿Ya tiene cuenta?{' '}
                <Link
                  href="/login"
                  className="text-[var(--accent)] hover:text-[var(--accent-hover)]"
                >
                  Iniciar sesión
                </Link>
              </p>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-[var(--text-tertiary)]/50 mt-6">
          Al crear una cuenta acepta los términos de uso.{' '}
          <a
            href="https://auctorum.com.mx"
            className="hover:text-[var(--text-secondary)] transition-colors"
          >
            auctorum.com.mx
          </a>
        </p>
      </div>
    </div>
  )
}

const inputCls =
  'w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] text-sm focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}
