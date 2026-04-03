import Image from 'next/image';

export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] py-10 px-6">
      <div className="max-w-6xl mx-auto flex flex-col items-center gap-5">
        <div className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Auctorum"
            width={18}
            height={18}
            className="h-[18px] w-auto opacity-60"
          />
          <span className="font-mono text-[11px] tracking-[0.15em] uppercase text-[var(--text-tertiary)]">
            AUCTORUM
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-[var(--text-tertiary)]">
          <a href="/systems" className="hover:text-[var(--text-primary)] transition-colors">
            Systems
          </a>
          <a href="/platform" className="hover:text-[var(--text-primary)] transition-colors">
            Platform
          </a>
          <a
            href="https://github.com/cocopsn/auctorum-systems"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--text-primary)] transition-colors"
          >
            GitHub
          </a>
        </div>

        <p className="text-xs text-[var(--text-tertiary)]/60">
          &copy; 2026 Auctorum &middot; Armando Flores &middot; Saltillo, Coahuila, MX
        </p>
      </div>
    </footer>
  );
}
