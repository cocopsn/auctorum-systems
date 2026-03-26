import Image from 'next/image';

type ActivePage = 'home' | 'systems' | 'platform';

export function Navbar({ activePage }: { activePage?: ActivePage }) {
  const linkClass = (page: ActivePage) =>
    page === activePage
      ? 'text-sm text-auctorum-white'
      : 'text-sm text-auctorum-body hover:text-auctorum-white transition-colors';

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-auctorum-bg/80 border-b border-auctorum-border">
      <div className="max-w-7xl mx-auto px-6 md:px-8 flex items-center justify-between h-16">
        {/* Left: Logo + Name */}
        <a href="/" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Auctorum"
            width={28}
            height={28}
            className="h-7 w-auto object-contain"
          />
          <span className="text-sm font-semibold tracking-[0.25em] uppercase text-auctorum-white">
            AUCTORUM
          </span>
        </a>

        {/* Right desktop */}
        <div className="hidden md:flex items-center gap-8">
          <a
            href={activePage === 'home' ? '#vision' : '/'}
            className={linkClass('home')}
          >
            Visión
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
            className="border border-auctorum-border px-4 py-1.5 rounded-md text-sm text-auctorum-body hover:bg-auctorum-surface-2 hover:text-auctorum-white transition-colors"
          >
            GitHub →
          </a>
        </div>

        {/* Right mobile: CSS-only hamburger */}
        <input type="checkbox" id="mobile-menu" className="peer hidden" />
        <label
          htmlFor="mobile-menu"
          className="md:hidden cursor-pointer text-auctorum-white p-2"
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </label>
      </div>

      {/* Mobile menu overlay */}
      <div className="hidden peer-checked:flex md:!hidden flex-col gap-4 px-6 pb-6 bg-auctorum-bg/95 backdrop-blur-md border-b border-auctorum-border">
        <a
          href={activePage === 'home' ? '#vision' : '/'}
          className={`${linkClass('home')} py-2`}
        >
          Visión
        </a>
        <a href="/systems" className={`${linkClass('systems')} py-2`}>
          Systems
        </a>
        <a href="/platform" className={`${linkClass('platform')} py-2`}>
          Platform
        </a>
        <a
          href="https://github.com/cocopsn/auctorum-systems"
          target="_blank"
          rel="noopener noreferrer"
          className="border border-auctorum-border px-4 py-2 rounded-md text-sm text-auctorum-body text-center hover:bg-auctorum-surface-2 hover:text-auctorum-white transition-colors"
        >
          GitHub →
        </a>
        <label
          htmlFor="mobile-menu"
          className="text-xs text-auctorum-body/50 text-center cursor-pointer py-1"
        >
          Cerrar
        </label>
      </div>
    </nav>
  );
}
