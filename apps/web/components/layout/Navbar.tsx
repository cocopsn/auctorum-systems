'use client';

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/cn';

type ActivePage = 'home' | 'systems' | 'platform';

export function Navbar({ activePage }: { activePage?: ActivePage }) {
  const [open, setOpen] = useState(false);
  const isHome = activePage === 'home';

  const linkClass = (page: ActivePage) =>
    page === activePage
      ? isHome
        ? 'text-sm font-medium text-white'
        : 'text-sm font-medium text-[var(--text-primary)]'
      : isHome
        ? 'text-sm text-white/70 transition-colors hover:text-white'
        : 'text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]';

  return (
    <nav
      className={cn(
        'sticky top-0 z-50 backdrop-blur-2xl',
        isHome
          ? 'border-b border-white/10 bg-[#070b1f]/70'
          : 'border-b border-black/5 bg-white/90'
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6">
        <a href="/" className="flex items-center gap-3">
          <Image
            src={isHome ? '/logo-transparent.png' : '/logo1-transparent.png'}
            alt="Auctorum"
            width={28}
            height={28}
            className="h-7 w-auto"
          />
          <span
            className={cn(
              'text-sm font-semibold tracking-[0.08em]',
              isHome ? 'text-white' : 'text-[var(--text-primary)]'
            )}
          >
            Auctorum
          </span>
        </a>

        <div className="hidden items-center gap-8 md:flex">
          <a href="/" className={cn(linkClass('home'), 'hidden lg:inline-flex')}>
            About
          </a>
          <a href="/systems" className={linkClass('systems')}>
            Systems
          </a>
          <a href="/platform" className={linkClass('platform')}>
            Platform
          </a>
          <a
            href="/#tech-breakdown"
            className={cn(
              'text-sm transition-colors',
              isHome
                ? 'text-white/70 hover:text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            )}
          >
            Architecture
          </a>
          <a
            href="/login"
            className={cn(
              'text-sm transition-colors',
              isHome
                ? 'text-white/70 hover:text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            )}
          >
            Log in
          </a>
        </div>

        <a
          href="/signup"
          className={cn(
            'hidden rounded-full px-5 py-2.5 text-sm font-medium transition md:inline-flex',
            isHome
              ? 'border border-white/10 bg-white/[0.08] text-white hover:bg-white/[0.12]'
              : 'border border-black/5 bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:border-[var(--border-hover)]'
          )}
        >
          Sign up
        </a>

        <button
          onClick={() => setOpen(!open)}
          className={cn(
            'p-2 md:hidden',
            isHome ? 'text-white/80' : 'text-[var(--text-secondary)]'
          )}
          aria-label="Menu"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-5 w-5"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            {open ? (
              <path d="M6 6l12 12M6 18L18 6" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div
          className={cn(
            'flex flex-col gap-1 px-6 pb-4 md:hidden backdrop-blur-2xl',
            isHome
              ? 'border-b border-white/10 bg-[#070b1f]/95'
              : 'border-b border-black/5 bg-white/95'
          )}
        >
          <a
            href="/"
            onClick={() => setOpen(false)}
            className={cn(
              'py-2 text-sm',
              isHome
                ? 'text-white/70 hover:text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            )}
          >
            About
          </a>
          <a href="/systems" onClick={() => setOpen(false)} className={`${linkClass('systems')} py-2`}>
            Systems
          </a>
          <a href="/platform" onClick={() => setOpen(false)} className={`${linkClass('platform')} py-2`}>
            Platform
          </a>
          <a
            href="/#tech-breakdown"
            onClick={() => setOpen(false)}
            className={cn(
              'py-2 text-sm',
              isHome
                ? 'text-white/70 hover:text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            )}
          >
            Architecture
          </a>
          <a
            href="/login"
            onClick={() => setOpen(false)}
            className={cn(
              'py-2 text-sm',
              isHome
                ? 'text-white/70 hover:text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            )}
          >
            Log in
          </a>
          <a
            href="/signup"
            onClick={() => setOpen(false)}
            className={cn(
              'mt-2 inline-flex rounded-full px-5 py-2.5 text-sm font-medium',
              isHome
                ? 'border border-white/10 bg-white/[0.08] text-white'
                : 'border border-black/5 bg-[var(--bg-secondary)] text-[var(--text-primary)]'
            )}
          >
            Sign up
          </a>
        </div>
      )}
    </nav>
  );
}
