import Image from 'next/image';

export function Footer() {
  return (
    <footer className="border-t border-auctorum-border py-12 px-6">
      <div className="max-w-5xl mx-auto flex flex-col items-center gap-6">
        {/* Top: Logo + Name */}
        <div className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Auctorum"
            width={20}
            height={20}
            className="h-5 w-auto object-contain"
          />
          <span className="font-mono text-xs tracking-[0.15em] uppercase text-auctorum-light">
            AUCTORUM
          </span>
        </div>

        {/* Middle: Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-auctorum-body/60">
          <a
            href="https://github.com/cocopsn/auctorum-systems"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-auctorum-white transition-colors"
          >
            GitHub
          </a>
          <a href="/systems" className="hover:text-auctorum-white transition-colors">
            Systems
          </a>
          <a href="/platform" className="hover:text-auctorum-white transition-colors">
            Platform
          </a>
          <a
            href="mailto:contacto@auctorum.com.mx"
            className="hover:text-auctorum-white transition-colors"
          >
            contacto@auctorum.com.mx
          </a>
        </div>

        {/* Bottom: Copyright */}
        <p className="text-xs text-auctorum-body/50">
          © 2026 Auctorum. Armando Flores. Saltillo, Coahuila, MX
        </p>
      </div>
    </footer>
  );
}
