export const dynamic = 'force-static';

import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';

/* ═══════════════════════════════════════════════════════════
   AUCTORUM — Plataforma de IA Personal Soberana v3
   ═══════════════════════════════════════════════════════════ */

const stackItems = [
  { name: 'Ollama', description: 'Runtime GPU local para modelos open source' },
  { name: 'OpenClaw', description: 'Orquestador de agentes e gateway de IA' },
  { name: 'Tailscale', description: 'Red Zero-Trust, sin puertos públicos' },
  { name: 'WhatsApp', description: 'Interfaz principal del usuario final' },
  { name: 'Tauri', description: 'Aplicación desktop nativa (futuro)' },
  { name: 'ESP32/RPi', description: 'Hardware de voz propio (futuro)' },
];

const phases = [
  { label: 'Fase 1', title: 'Core Local', description: 'Ollama + agentes autónomos + WhatsApp', status: 'completed' as const },
  { label: 'Fase 2', title: 'Multi-dispositivo', description: 'Tailscale mesh + desktop app', status: 'in-progress' as const },
  { label: 'Fase 3', title: 'Hardware Propio', description: 'ESP32 wake word + voz local', status: 'planned' as const },
];

const dotColors = {
  completed: 'bg-[var(--success)] border-[var(--success)]',
  'in-progress': 'bg-[var(--accent)] border-[var(--accent)]',
  planned: 'bg-[var(--bg-tertiary)] border-[var(--text-tertiary)]',
};

export default function PlatformPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <Navbar activePage="platform" />

      {/* Header */}
      <section className="pt-20 pb-16 text-center px-6">
        <h1 className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] tracking-tight">
          Auctorum Platform
        </h1>
        <p className="text-base text-[var(--text-secondary)] mt-4 max-w-xl mx-auto">
          IA Personal Soberana — tu inteligencia artificial, tu hardware, tus datos
        </p>
      </section>

      {/* The Problem */}
      <section className="pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="text-lg text-[var(--text-secondary)] leading-relaxed">
            Hoy tienes dos opciones: pagar suscripciones cloud que procesan tus
            datos en servidores ajenos, o no tener nada.
          </p>
          <p className="text-xl font-semibold text-[var(--text-primary)] mt-4">
            Auctorum crea la tercera opción.
          </p>
        </div>
      </section>

      {/* Stack */}
      <section className="pb-24 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-sm font-mono uppercase tracking-widest text-[var(--accent)] mb-8">
            Stack Técnico
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {stackItems.map((item) => (
              <div
                key={item.name}
                className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--border-hover)] transition-colors"
              >
                <p className="text-sm font-semibold text-[var(--text-primary)]">{item.name}</p>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section className="pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-sm font-mono uppercase tracking-widest text-[var(--accent)] mb-8">
            Roadmap
          </h2>
          <div className="border-l border-[var(--border)] ml-1.5">
            {phases.map((phase) => (
              <div key={phase.label} className="relative pl-8 pb-8 last:pb-0">
                <div
                  className={`absolute left-[-5px] top-1 w-2.5 h-2.5 rounded-full border-2 ${dotColors[phase.status]}`}
                />
                <p className="font-mono text-xs tracking-wider uppercase text-[var(--text-tertiary)]">
                  {phase.label}
                </p>
                <h3 className="text-base font-semibold text-[var(--text-primary)] mt-1">{phase.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1">{phase.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Manifesto */}
      <section className="pb-24 px-6">
        <div className="max-w-2xl mx-auto border-l-2 border-[var(--accent)] pl-6">
          <p className="font-serif italic text-xl text-[var(--text-primary)] leading-relaxed">
            Todo corre en tu servidor. Modelos open source. Red privada. Cero
            datos saliendo de tu hardware. Costo recurrente cero.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-24 text-center px-6">
        <a
          href="https://github.com/cocopsn/auctorum-systems"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block border border-[var(--border)] px-5 py-2.5 rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-colors"
        >
          Ver código en GitHub &rarr;
        </a>
      </section>

      <Footer />
    </div>
  );
}
