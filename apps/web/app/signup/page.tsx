'use client';

import { useState, useEffect, FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Loader2, Check, X } from 'lucide-react';
import { validateSlug, suggestSlug } from '@/lib/slug';

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle');
  const [slugError, setSlugError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (slugEdited) return;
    setSlug(suggestSlug(businessName));
  }, [businessName, slugEdited]);

  useEffect(() => {
    if (!slug) { setSlugStatus('idle'); setSlugError(''); return; }
    const clientError = validateSlug(slug);
    if (clientError) { setSlugStatus('invalid'); setSlugError(clientError); return; }
    setSlugStatus('checking');
    setSlugError('');
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/signup/check-slug?slug=${encodeURIComponent(slug)}`);
        const data = await res.json();
        if (data.available) { setSlugStatus('available'); setSlugError(''); }
        else { setSlugStatus('taken'); setSlugError(data.error ?? 'No disponible'); }
      } catch { setSlugStatus('idle'); }
    }, 400);
    return () => clearTimeout(timer);
  }, [slug]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (slugStatus !== 'available') { setError('Resuelva el error de subdominio antes de continuar'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, fullName, businessName, slug }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) { setError(data.error ?? 'Error al crear la cuenta'); return; }
      setSubmitted(true);
    } catch { setError('Error de conexión. Intente de nuevo.'); }
    finally { setSubmitting(false); }
  }

  const canSubmit = fullName && email && businessName && slug && slugStatus === 'available' && !submitting;

  const inputCls = 'w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-6 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="Auctorum" width={48} height={48} className="mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-slate-900">Crear cuenta</h1>
          <p className="text-sm text-slate-500 mt-1">Auctorum Systems — Concierge Médico AI</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-8">
          {submitted ? (
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-6 h-6 text-emerald-600" />
              </div>
              <h2 className="text-base font-semibold text-slate-900 mb-2">¡Cuenta creada!</h2>
              <p className="text-sm text-slate-500">
                Le hemos enviado un enlace de acceso a <span className="font-medium text-slate-900">{email}</span>.
              </p>
              <p className="text-xs text-slate-400 mt-4">
                Su subdominio: <code className="font-mono">{slug}.auctorum.com.mx</code>
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Su nombre completo</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required maxLength={120} placeholder="Juan Pérez" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Correo electrónico</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required maxLength={255} placeholder="juan@empresa.com" autoComplete="email" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre del negocio</label>
                <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} required maxLength={255} placeholder="Grupo Industrial Ejemplo" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Subdominio</label>
                <div className="relative">
                  <input type="text" value={slug} onChange={e => { setSlug(e.target.value.toLowerCase()); setSlugEdited(true); }} required maxLength={63} placeholder="miempresa" className={inputCls + ' pr-36'} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">.auctorum.com.mx</span>
                </div>
                <div className="mt-1 h-4 text-xs flex items-center gap-1">
                  {slugStatus === 'checking' && <span className="text-slate-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Verificando...</span>}
                  {slugStatus === 'available' && <span className="text-emerald-600 flex items-center gap-1"><Check className="w-3 h-3" /> Disponible</span>}
                  {(slugStatus === 'taken' || slugStatus === 'invalid') && <span className="text-red-600 flex items-center gap-1"><X className="w-3 h-3" /> {slugError}</span>}
                </div>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={!canSubmit}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Crear cuenta
              </button>
              <p className="text-xs text-slate-500 text-center pt-2">
                ¿Ya tiene cuenta? <Link href="/login" className="text-blue-600 hover:text-blue-800">Iniciar sesión</Link>
              </p>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Al crear una cuenta acepta los términos de uso.{' '}
          <a href="https://auctorum.com.mx" className="hover:text-slate-600 transition-colors">auctorum.com.mx</a>
        </p>
      </div>
    </div>
  );
}
