export const dynamic = 'force-static';

import Image from 'next/image';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';

/* ═══════════════════════════════════════════════════════════
   AUCTORUM — Landing Page v3 "Linear Premium"
   ═══════════════════════════════════════════════════════════ */

function Hero() {
  return (
    <section className="relative flex flex-col items-center text-center min-h-[85vh] justify-center px-6 bg-grid">
      {/* Subtle radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 50% 40% at 50% 40%, rgba(45, 122, 255, 0.06) 0%, transparent 70%)',
        }}
      />

      <div className="relative">
        <Image
          src="/logo.png"
          alt="Auctorum"
          width={120}
          height={120}
          className="animate-fade-in"
          priority
        />
      </div>

      <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-[var(--text-primary)] mt-8 animate-fade-in delay-1">
        AUCTORUM
      </h1>

      <p className="text-base md:text-lg text-[var(--text-secondary)] mt-4 animate-fade-in delay-2">
        Software e Inteligencia Artificial
      </p>

      <div className="mt-10 flex gap-3 animate-fade-in delay-3">
        <a
          href="/systems"
          className="bg-[var(--accent)] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors"
        >
          Explorar Systems
        </a>
        <a
          href="https://github.com/cocopsn/auctorum-systems"
          target="_blank"
          rel="noopener noreferrer"
          className="border border-[var(--border)] px-5 py-2.5 rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-colors"
        >
          GitHub
        </a>
      </div>
    </section>
  );
}

function Vision() {
  return (
    <section id="vision" className="py-24 md:py-32 px-6">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-sm font-mono uppercase tracking-widest text-[var(--accent)] mb-8">
          Nuestra Vision
        </h2>

        <p className="text-2xl md:text-3xl font-semibold text-[var(--text-primary)] leading-snug">
          Construimos tecnología que democratiza el acceso a la inteligencia artificial
          y el software de calidad empresarial.
        </p>

        <div className="mt-8 border-l-2 border-[var(--accent)] pl-6">
          <p className="text-base text-[var(--text-secondary)] leading-relaxed">
            La inteligencia artificial no debería requerir suscripciones mensuales
            ni entregar tus datos a terceros. Auctorum demuestra que la soberanía
            digital es técnicamente viable en hardware de consumo.
          </p>
        </div>

        <p className="mt-8 font-mono text-sm tracking-wide text-[var(--text-tertiary)]">
          Democratización <span className="text-[var(--accent)]">&middot;</span> Accesibilidad{' '}
          <span className="text-[var(--accent)]">&middot;</span> Privacidad{' '}
          <span className="text-[var(--accent)]">&middot;</span> Soberanía
        </p>
      </div>
    </section>
  );
}

function DosPilares() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6">
        {/* Platform card */}
        <a
          href="/platform"
          className="group bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-8 hover:border-[var(--accent)]/30 transition-all duration-300"
        >
          <div className="h-px w-full bg-gradient-to-r from-[var(--accent)] to-blue-400 rounded-full" />

          <p className="font-mono text-[11px] tracking-[0.25em] text-[var(--accent)] mt-6 uppercase">
            Plataforma
          </p>

          <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-3">
            IA Personal Soberana
          </h3>

          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mt-3">
            Infraestructura de inteligencia artificial que opera enteramente en hardware
            local. Modelos open source, agentes autónomos, red Zero-Trust. Sin
            telemetría, sin dependencias cloud, costo recurrente cero.
          </p>

          <span className="inline-block text-[var(--accent)] text-sm font-medium mt-5 group-hover:translate-x-0.5 transition-transform">
            Explorar plataforma &rarr;
          </span>
        </a>

        {/* Systems card */}
        <a
          href="/systems"
          className="group bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-8 hover:border-[var(--success)]/30 transition-all duration-300"
        >
          <div className="h-px w-full bg-gradient-to-r from-[var(--success)] to-emerald-400 rounded-full" />

          <p className="font-mono text-[11px] tracking-[0.25em] text-[var(--success)] mt-6 uppercase">
            Software comercial
          </p>

          <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-3">
            SaaS Verticales de Nicho
          </h3>

          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mt-3">
            Soluciones SaaS diseñadas para industrias específicas. Motor de
            cotizaciones B2B con portales white-label, concierge médico con agenda
            inteligente. Integración WhatsApp, PDFs, multi-tenant.
          </p>

          <span className="inline-block text-[var(--success)] text-sm font-medium mt-5 group-hover:translate-x-0.5 transition-transform">
            Ver productos &rarr;
          </span>
        </a>
      </div>
    </section>
  );
}

function TechStack() {
  const techs = ['Next.js', 'TypeScript', 'Supabase', 'Tailwind', 'Drizzle'];
  return (
    <section className="py-16 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <p className="text-xs font-mono uppercase tracking-widest text-[var(--text-tertiary)] mb-4">
          Construido con
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          {techs.map((t) => (
            <span
              key={t}
              className="font-mono text-sm text-[var(--text-tertiary)] px-3 py-1 border border-[var(--border)] rounded-md"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Manifiesto() {
  return (
    <section className="py-24 md:py-32 text-center px-6">
      <p className="font-serif italic text-2xl md:text-3xl text-[var(--text-primary)] max-w-3xl mx-auto leading-relaxed">
        Porque la inteligencia que organiza tu vida debe pertenecerte.
      </p>

      <div className="mt-10">
        <a
          href="https://github.com/cocopsn/auctorum-systems"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block border border-[var(--border)] px-5 py-2.5 rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-colors"
        >
          Contribuir en GitHub &rarr;
        </a>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <Navbar activePage="home" />
      <Hero />
      <Vision />
      <DosPilares />
      <TechStack />
      <Manifiesto />
      <Footer />
    </div>
  );
}
