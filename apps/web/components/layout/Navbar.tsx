'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

type ActivePage = 'home' | 'systems' | 'platform';

export function Navbar({ activePage }: { activePage?: ActivePage }) {
  const [open, setOpen] = useState(false);

  const linkClass = (page: ActivePage) =>
    page === activePage
      ? 'text-sm font-medium text-blue-600'
      : 'text-sm text-slate-600 hover:text-slate-900 transition-colors';

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.png" alt="Auctorum" width={32} height={32} className="h-8 w-auto" />
          <span className="text-sm font-semibold text-slate-900">Auctorum</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <Link href="/systems" className={linkClass('systems')}>
            Concierge Médico
          </Link>
          <Link href="/platform" className={linkClass('platform')}>
            Cotizador B2B
          </Link>
          <a href="/systems#precios" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
            Precios
          </a>
          <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
            Iniciar sesión
          </Link>
        </div>

        <Link
          href="/signup"
          className="hidden rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors md:inline-flex"
        >
          Comenzar Gratis
        </Link>

        <button onClick={() => setOpen(!open)} className="p-2 text-slate-600 md:hidden" aria-label="Menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-200 bg-white px-6 pb-4 md:hidden">
          <Link href="/systems" onClick={() => setOpen(false)} className={`block py-2 ${linkClass('systems')}`}>
            Concierge Médico
          </Link>
          <Link href="/platform" onClick={() => setOpen(false)} className={`block py-2 ${linkClass('platform')}`}>
            Cotizador B2B
          </Link>
          <a href="/systems#precios" onClick={() => setOpen(false)} className="block py-2 text-sm text-slate-600">
            Precios
          </a>
          <Link href="/login" onClick={() => setOpen(false)} className="block py-2 text-sm text-slate-600">
            Iniciar sesión
          </Link>
          <Link href="/signup" onClick={() => setOpen(false)} className="mt-2 block rounded-full bg-blue-600 px-5 py-2.5 text-center text-sm font-medium text-white">
            Comenzar Gratis
          </Link>
        </div>
      )}
    </nav>
  );
}
