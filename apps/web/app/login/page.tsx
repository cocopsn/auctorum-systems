'use client';

import { useState, FormEvent } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al enviar el enlace');
        return;
      }

      setSent(true);
    } catch {
      setError('Error de conexión. Intente de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-[#1B3A5C] mb-4">
            <span className="text-white font-bold text-xl">AS</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Auctorum Systems</h1>
          <p className="text-sm text-gray-500 mt-1">Motor de Cotizaciones B2B</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Revise su correo</h2>
              <p className="text-sm text-gray-500">
                Le hemos enviado un enlace de acceso a{' '}
                <span className="font-medium text-gray-700">{email}</span>.
                Haga clic en el enlace para iniciar sesión.
              </p>
              <button
                onClick={() => { setSent(false); setEmail(''); }}
                className="mt-6 text-sm text-[#1B3A5C] hover:underline"
              >
                Usar otro correo
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Iniciar sesión</h2>
              <p className="text-sm text-gray-500 mb-6">
                Ingrese su correo y le enviaremos un enlace de acceso seguro.
              </p>

              <form onSubmit={handleSubmit} noValidate>
                <div className="mb-4">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Correo electrónico
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="admin@empresa.com"
                    required
                    autoComplete="email"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A5C] focus:border-transparent transition"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600 mb-4">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full bg-[#1B3A5C] text-white font-medium py-2.5 px-4 rounded-lg text-sm hover:bg-[#15304d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1B3A5C] disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {loading ? 'Enviando...' : 'Enviar enlace de acceso'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by Auctorum Systems &middot;{' '}
          <a href="https://auctorum.com.mx" className="hover:underline">auctorum.com.mx</a>
        </p>
      </div>
    </div>
  );
}
