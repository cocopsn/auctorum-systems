'use client'

import { useState, FormEvent } from 'react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al enviar el enlace')
        return
      }

      setSent(true)
    } catch {
      setError('Error de conexión. Intente de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col justify-center items-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--accent-muted)] mb-4">
            <svg className="w-6 h-6 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Concierge Médico</h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">Acceso para doctores</p>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-8">
          {sent ? (
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
                onClick={() => { setSent(false); setEmail('') }}
                className="mt-6 text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
              >
                Usar otro correo
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">Iniciar sesión</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-6">
                Ingrese su correo y le enviaremos un enlace de acceso seguro.
              </p>

              <form onSubmit={handleSubmit} noValidate>
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
                  <p className="text-sm text-[var(--error)] mb-4">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full bg-[var(--accent)] text-white font-medium py-2.5 px-4 rounded-lg text-sm hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Enviando...' : 'Enviar enlace de acceso'}
                </button>
              </form>
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
