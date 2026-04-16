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
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="Auctorum" width={120} height={120} className="mx-auto mb-4 h-16 w-auto" />
          <h1 className="text-xl font-semibold text-white">Auctorum Systems</h1>
          <p className="text-sm text-slate-400 mt-1">Plataforma de Gestión Inteligente</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-base font-semibold text-white mb-2">Revise su correo</h2>
              <p className="text-sm text-slate-400">
                Le hemos enviado un enlace de acceso a{' '}
                <span className="font-medium text-white">{email}</span>.
              </p>
              <button onClick={() => { setSent(false); setEmail(''); }} className="mt-6 text-sm text-blue-400 hover:text-blue-300 transition-colors">
                Usar otro correo
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-base font-semibold text-white mb-1">Iniciar sesión</h2>
              <p className="text-sm text-slate-400 mb-6">Ingrese su correo y le enviaremos un enlace de acceso seguro.</p>
              <form onSubmit={handleSubmit} noValidate>
                <div className="mb-4">
                  <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">Correo electrónico</label>
                  <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@empresa.com" required autoComplete="email"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-700 bg-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" />
                </div>
                {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
                <button type="submit" disabled={loading || !email}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 px-4 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  {loading ? 'Enviando...' : 'Enviar enlace de acceso'}
                </button>
              </form>
              <p className="text-center text-sm text-slate-400 mt-6">
                ¿No tiene cuenta?{' '}
                <Link href="/signup" className="text-blue-400 hover:text-blue-300 font-medium">Regístrate</Link>
              </p>
            </>
          )}
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Powered by Auctorum Systems &middot;{' '}
          <a href="https://auctorum.com.mx" className="hover:text-slate-400 transition-colors">auctorum.com.mx</a>
        </p>
      </div>
    </div>
  );
}
