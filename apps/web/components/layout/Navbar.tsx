'use client';

import Image from 'next/image';
import { useState } from 'react';

type ActivePage = 'home' | 'systems' | 'platform';

export function Navbar({ activePage }: { activePage?: ActivePage }) {
  const [open, setOpen] = useState(false);

  const linkClass = (page: ActivePage) =>
    page === activePage
      ? 'text-sm text-[var(--text-primary)] font-medium'
      : 'text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors';

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[var(--bg-primary)]/80 border-b border-[var(--border)]">
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-14">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt="Auctorum"
            width={24}
            height={24}
            className="h-6 w-auto"
          />
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-[var(--text-primary)]">
            AUCTORUM
          </span>
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          <a href={activePage === 'home' ? '#vision' : '/'} className={linkClass('home')}>
            Vision
          </a>
          <a href="/systems" className={linkClass('systems')}>
            Systems
          </a>
          <a href="/platform" className={linkClass('platform')}>
            Platform
          </a>
          <a
            href="https://github.com/cocopsn/auctorum-systems"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          >
            GitHub
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 text-[var(--text-secondary)]"
          aria-label="Menu"
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.5">
            {open ? (
              <path d="M6 6l12 12M6 18L18 6" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden flex flex-col gap-1 px-6 pb-4 bg-[var(--bg-primary)]/95 backdrop-blur-xl border-b border-[var(--border)]">
          <a
            href={activePage === 'home' ? '#vision' : '/'}
            onClick={() => setOpen(false)}
            className={`${linkClass('home')} py-2`}
          >
            Vision
          </a>
          <a href="/systems" onClick={() => setOpen(false)} className={`${linkClass('systems')} py-2`}>
            Systems
          </a>
          <a href="/platform" onClick={() => setOpen(false)} className={`${linkClass('platform')} py-2`}>
            Platform
          </a>
          <a
            href="https://github.com/cocopsn/auctorum-systems"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] py-2"
          >
            GitHub
          </a>
        </div>
      )}
    </nav>
  );
}
