'use client';

import { useState, FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';

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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="Auctorum" width={120} height={120} className="mx-auto mb-4 h-16 w-auto" />
          <h1 className="text-xl font-semibold text-slate-900">Auctorum Systems</h1>
          <p className="text-sm text-slate-500 mt-1">Concierge Médico AI</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-base font-semibold text-slate-900 mb-2">Revise su correo</h2>
              <p className="text-sm text-slate-500">
                Le hemos enviado un enlace de acceso a{' '}
                <span className="font-medium text-slate-900">{email}</span>.
              </p>
              <button onClick={() => { setSent(false); setEmail(''); }} className="mt-6 text-sm text-blue-600 hover:text-blue-800 transition-colors">
                Usar otro correo
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-base font-semibold text-slate-900 mb-1">Iniciar sesión</h2>
              <p className="text-sm text-slate-500 mb-6">Ingrese su correo y le enviaremos un enlace de acceso seguro.</p>
              <form onSubmit={handleSubmit} noValidate>
                <div className="mb-4">
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">Correo electrónico</label>
                  <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@empresa.com" required autoComplete="email"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" />
                </div>
                {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
                <button type="submit" disabled={loading || !email}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  {loading ? 'Enviando...' : 'Enviar enlace de acceso'}
                </button>
              </form>
              <p className="text-center text-sm text-slate-500 mt-6">
                ¿No tiene cuenta?{' '}
                <Link href="/signup" className="text-blue-600 hover:text-blue-800 font-medium">Regístrate</Link>
              </p>
            </>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Powered by Auctorum Systems &middot;{' '}
          <a href="https://auctorum.com.mx" className="hover:text-slate-600 transition-colors">auctorum.com.mx</a>
        </p>
      </div>
    </div>
  );
}
