export const dynamic = 'force-static';

import Image from 'next/image';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';

/* ═══════════════════════════════════════════════════════════
   AUCTORUM — Enterprise Corporate Landing Page
   Privacidad. Control. Autoría.
   ═══════════════════════════════════════════════════════════ */

// ─── Section 2: Hero ─────────────────────────────────────

function Hero() {
  return (
    <section className="flex flex-col items-center text-center py-32 md:py-40 relative px-6">
      {/* Logo with subtle radial glow behind */}
      <div className="relative">
        <div
          className="absolute inset-0 -inset-x-20 -inset-y-20"
          style={{
            background: 'radial-gradient(circle, #2d7aff10 0%, transparent 60%)',
          }}
        />
        <Image
          src="/logo.png"
          alt="Auctorum"
          width={160}
          height={160}
          className="relative"
          priority
        />
      </div>

      {/* Title */}
      <h1 className="font-extrabold text-4xl md:text-6xl text-auctorum-white mt-8 animate-fade-in">
        AUCTORUM
      </h1>

      {/* Tagline */}
      <p className="font-mono text-xs tracking-[0.4em] text-auctorum-body/50 mt-4">
        PRIVACIDAD · CONTROL · AUTORÍA
      </p>

      {/* Description */}
      <p className="font-light text-lg text-auctorum-body mt-6">
        Organización de Software e Inteligencia Artificial
      </p>

      {/* CTAs */}
      <div className="mt-10 flex gap-4">
        <a
          href="#vision"
          className="bg-auctorum-blue text-white px-6 py-3 rounded-lg font-medium transition-colors hover:opacity-90"
        >
          Conocer más
        </a>
        <a
          href="https://github.com/cocopsn/auctorum-systems"
          target="_blank"
          rel="noopener noreferrer"
          className="border border-auctorum-border px-6 py-3 rounded-lg text-auctorum-body hover:text-auctorum-white hover:bg-auctorum-surface-2 transition-colors"
        >
          GitHub
        </a>
      </div>
    </section>
  );
}

// ─── Section 3: Propósito ─────────────────────────────────

function Proposito() {
  return (
    <section id="vision" className="py-24 md:py-32 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <p className="font-semibold text-2xl md:text-3xl text-auctorum-white leading-snug animate-slide-up">
          Construimos tecnología que democratiza el acceso a la inteligencia artificial
          y el software de calidad empresarial.
        </p>

        {/* Horizontal values row */}
        <p className="mt-8 font-mono text-sm tracking-wide text-auctorum-body/60">
          Democratización{' '}
          <span className="text-auctorum-blue">·</span> Accesibilidad{' '}
          <span className="text-auctorum-blue">·</span> Privacidad{' '}
          <span className="text-auctorum-blue">·</span> Soberanía
        </p>
      </div>
    </section>
  );
}

// ─── Section 4: Dos Pilares ──────────────────────────────

function DosPilares() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
        {/* Card 1 — Auctorum (blue) */}
        <div className="bg-auctorum-surface-1 border border-auctorum-border rounded-2xl p-8 md:p-10 hover:border-auctorum-blue/30 transition-colors duration-300">
          <div className="h-0.5 w-full bg-gradient-to-r from-auctorum-blue to-auctorum-cyan rounded-full" />

          <p className="font-mono text-[11px] tracking-[0.3em] text-auctorum-blue mt-6">
            PLATAFORMA
          </p>

          <h3 className="text-2xl font-bold text-auctorum-white mt-3">
            IA Personal Soberana
          </h3>

          <p className="text-sm text-auctorum-body leading-relaxed mt-4">
            Infraestructura de inteligencia artificial que opera enteramente en hardware
            local. Modelos open source, agentes autónomos, red Zero-Trust. Sin
            telemetría, sin dependencias cloud, costo recurrente cero.
          </p>

          <a
            href="/platform"
            className="inline-block text-auctorum-blue text-sm font-medium mt-6 hover:underline transition-colors"
          >
            Explorar plataforma →
          </a>
        </div>

        {/* Card 2 — Systems (green) */}
        <div className="bg-auctorum-surface-1 border border-auctorum-border rounded-2xl p-8 md:p-10 hover:border-auctorum-green/30 transition-colors duration-300">
          <div className="h-0.5 w-full bg-gradient-to-r from-auctorum-green to-emerald-400 rounded-full" />

          <p className="font-mono text-[11px] tracking-[0.3em] text-auctorum-green mt-6">
            SOFTWARE COMERCIAL
          </p>

          <h3 className="text-2xl font-bold text-auctorum-white mt-3">
            SaaS Verticales de Nicho
          </h3>

          <p className="text-sm text-auctorum-body leading-relaxed mt-4">
            Soluciones SaaS diseñadas para industrias específicas. Motor de
            cotizaciones B2B con portales white-label, concierge médico con agenda
            inteligente. Integración WhatsApp, generación de PDFs,
            arquitectura multi-tenant.
          </p>

          <a
            href="/systems"
            className="inline-block text-auctorum-green text-sm font-medium mt-6 hover:underline transition-colors"
          >
            Ver productos →
          </a>
        </div>
      </div>
    </section>
  );
}

// ─── Section 5: La Tesis ─────────────────────────────────

function LaTesis() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="font-serif italic text-3xl md:text-4xl text-auctorum-white">
          El Linux de las IAs
        </h2>

        <div className="mt-6 border-l-2 border-auctorum-blue pl-6 text-left">
          <p className="text-base text-auctorum-body leading-relaxed">
            La inteligencia artificial no debería requerir suscripciones mensuales
            ni entregar tus datos a terceros. Auctorum demuestra que la soberanía
            digital es técnicamente viable en hardware de consumo.
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── Section 6: Manifiesto ───────────────────────────────

function Manifiesto() {
  return (
    <section className="py-24 md:py-32 text-center px-6">
      <p className="font-serif italic text-2xl md:text-3xl text-auctorum-light max-w-3xl mx-auto leading-relaxed">
        Porque la inteligencia que organiza tu vida debe pertenecerte.
      </p>

      <div className="mt-10">
        <a
          href="https://github.com/cocopsn/auctorum-systems"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block border border-auctorum-border px-6 py-3 rounded-lg hover:bg-auctorum-surface-2 text-auctorum-body hover:text-auctorum-white transition-colors"
        >
          Contribuir en GitHub →
        </a>
      </div>
    </section>
  );
}

// ─── Main Page ────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="min-h-screen bg-auctorum-bg">
      <Navbar activePage="home" />
      <Hero />
      <Proposito />
      <DosPilares />
      <LaTesis />
      <Manifiesto />
      <Footer />
    </div>
  );
}
