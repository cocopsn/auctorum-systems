'use client'

import { useState, FormEvent } from 'react'
import Image from 'next/image'
import { createBrowserClient } from '@supabase/ssr'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'password' | 'magic-link' | 'forgot'>('password')
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function handlePasswordLogin(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      if (authError.message.includes('Invalid login credentials')) {
        setError('Email o contraseña incorrectos')
      } else if (authError.message.includes('Email not confirmed')) {
        setError('Confirma tu email antes de iniciar sesión')
      } else {
        setError(authError.message)
      }
      setLoading(false)
      return
    }

    window.location.href = '/agenda'
  }

  async function handleMagicLink(e: FormEvent) {
    e.preventDefault()
    if (!email) {
      setError('Ingrese su correo electrónico')
      return
    }
    setLoading(true)
    setError('')

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
    })

    if (otpError) {
      setError(otpError.message)
    } else {
      setMagicLinkSent(true)
    }
    setLoading(false)
  }

  async function handleForgotPassword(e: FormEvent) {
    e.preventDefault()
    if (!email) {
      setError('Ingrese su correo electrónico')
      return
    }
    setLoading(true)
    setError('')

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (resetError) {
      setError(resetError.message)
    } else {
      setResetSent(true)
    }
    setLoading(false)
  }

  // --- Magic link sent confirmation ---
  if (magicLinkSent) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col justify-center items-center px-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <Image src="/AUCTORUMMORADO.png" alt="Auctorum" width={120} height={120} className="mx-auto mb-0 h-16 w-auto" />
          </div>
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-[var(--success)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-[var(--success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-base font-semibold text-[var(--text-primary)] mb-2">Revise su correo</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Le hemos enviado un enlace de acceso a{' '}
                <span className="font-medium text-[var(--text-primary)]">{email}</span>.
              </p>
              <button
                onClick={() => { setMagicLinkSent(false); setMode('password') }}
                className="mt-6 text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
              >
                Volver al login
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // --- Reset email sent confirmation ---
  if (resetSent) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col justify-center items-center px-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <Image src="/AUCTORUMMORADO.png" alt="Auctorum" width={120} height={120} className="mx-auto mb-0 h-16 w-auto" />
          </div>
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-[var(--success)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-[var(--success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-base font-semibold text-[var(--text-primary)] mb-2">Correo enviado</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Si existe una cuenta con{' '}
                <span className="font-medium text-[var(--text-primary)]">{email}</span>,
                recibirá un enlace para restablecer su contraseña.
              </p>
              <button
                onClick={() => { setResetSent(false); setMode('password') }}
                className="mt-6 text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
              >
                Volver al login
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col justify-center items-center px-6">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <Image src="/AUCTORUMMORADO.png" alt="Auctorum" width={120} height={120} className="mx-auto mb-0 h-16 w-auto" />
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Concierge Médico</h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">Acceso para doctores</p>
        </div>

        {/* Card */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-8">
          {mode === 'forgot' ? (
            <>
              <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">Recuperar contraseña</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-6">
                Ingrese su correo y le enviaremos un enlace para restablecer su contraseña.
              </p>

              <form onSubmit={handleForgotPassword} noValidate>
                <div className="mb-4">
                  <label htmlFor="email" className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                    Correo electrónico
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="doctora@clinica.com"
                    required
                    autoComplete="email"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] text-sm focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors"
                  />
                </div>

                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full bg-[var(--accent)] text-white font-medium py-2.5 px-4 rounded-lg text-sm hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  onClick={() => { setMode('password'); setError('') }}
                  className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                >
                  Volver al login
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">Iniciar sesión</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-6">
                Ingrese sus credenciales para acceder al dashboard.
              </p>

              {/* Password login form */}
              <form onSubmit={handlePasswordLogin} noValidate>
                <div className="mb-4">
                  <label htmlFor="email" className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                    Correo electrónico
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="doctora@clinica.com"
                    required
                    autoComplete="email"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] text-sm focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors"
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="password" className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] text-sm focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email || !password}
                  className="w-full bg-[var(--accent)] text-white font-medium py-2.5 px-4 rounded-lg text-sm hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
                </button>
              </form>

              {/* Forgot password */}
              <div className="mt-3 text-center">
                <button
                  onClick={() => { setMode('forgot'); setError('') }}
                  className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[var(--border)]" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-[var(--bg-secondary)] text-[var(--text-tertiary)]">o continuar con</span>
                </div>
              </div>

              {/* Magic link */}
              <button
                onClick={handleMagicLink}
                disabled={loading || !email}
                className="w-full border border-[var(--border)] text-[var(--text-secondary)] font-medium py-2.5 px-4 rounded-lg text-sm hover:bg-[var(--bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Enviando...' : 'Enviar magic link al email'}
              </button>

              {/* Contact */}
              <div className="mt-6 text-center">
                <p className="text-xs text-[var(--text-tertiary)]">
                  ¿No tienes cuenta?{' '}
                  <a href="https://wa.me/528445387404" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors">
                    Contáctanos
                  </a>
                </p>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">+52 844 538 7404</p>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-[var(--text-tertiary)]/50 mt-6">
          Powered by Auctorum Systems &middot;{' '}
          <a href="https://auctorum.com.mx" className="hover:text-[var(--text-secondary)] transition-colors">auctorum.com.mx</a>
        </p>
      </div>
    </div>
  )
}
