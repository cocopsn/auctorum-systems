export const dynamic = 'force-static';

import Image from 'next/image';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';

/* ═══════════════════════════════════════════════════════════
   AUCTORUM — Plataforma de IA Personal Soberana
   ═══════════════════════════════════════════════════════════ */

// ─── Stack Técnico ───────────────────────────────────────

const stackItems = [
  { icon: '🧠', name: 'Ollama', description: 'Runtime GPU local para modelos open source' },
  { icon: '⚡', name: 'OpenClaw', description: 'Orquestador de agentes e gateway de IA' },
  { icon: '🔒', name: 'Tailscale', description: 'Red Zero-Trust, sin puertos públicos expuestos' },
  { icon: '💬', name: 'WhatsApp', description: 'Interfaz principal del usuario final' },
  { icon: '🖥️', name: 'Tauri', description: 'Aplicación desktop nativa (futuro)' },
  { icon: '🎙️', name: 'ESP32/RPi', description: 'Hardware de voz propio (futuro)' },
];

// ─── Roadmap ─────────────────────────────────────────────

const phases = [
  {
    label: 'Fase 1',
    title: 'Core Local',
    description: 'Ollama + agentes autónomos + WhatsApp ✓',
    status: 'completed' as const,
  },
  {
    label: 'Fase 2',
    title: 'Multi-dispositivo',
    description: 'Tailscale mesh + desktop app',
    status: 'in-progress' as const,
  },
  {
    label: 'Fase 3',
    title: 'Hardware Propio',
    description: 'ESP32 wake word + voz local',
    status: 'planned' as const,
  },
];

const dotStyles = {
  completed: 'bg-auctorum-green border-auctorum-green',
  'in-progress': 'bg-auctorum-blue border-auctorum-blue',
  planned: 'bg-auctorum-border border-auctorum-border/50',
};

export default function PlatformPage() {
  return (
    <div className="min-h-screen bg-auctorum-bg">
      <Navbar activePage="platform" />

      {/* HERO */}
      <section className="py-24 text-center px-6">
        <h1 className="uppercase tracking-wider font-bold text-3xl text-auctorum-white">
          AUCTORUM
        </h1>
        <p className="font-light text-lg text-auctorum-body mt-4">
          Plataforma de IA Personal Soberana
        </p>
        <div className="h-0.5 w-24 mx-auto bg-auctorum-blue mt-6" />
      </section>

      {/* EL PROBLEMA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xl text-auctorum-body leading-relaxed">
            Hoy tienes dos opciones: pagar suscripciones cloud que procesan tus
            datos en servidores ajenos, o no tener nada.
          </p>
          <p className="text-2xl font-bold text-auctorum-white mt-6">
            Auctorum crea la tercera opción.
          </p>
        </div>
      </section>

      {/* STACK TÉCNICO */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-auctorum-white text-center mb-12">
            Stack Técnico
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {stackItems.map((item) => (
              <div
                key={item.name}
                className="bg-auctorum-surface-1 border border-auctorum-border rounded-xl p-6"
              >
                <span className="text-2xl">{item.icon}</span>
                <p className="text-sm font-bold text-auctorum-white mt-3">{item.name}</p>
                <p className="text-xs text-auctorum-body mt-1">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ROADMAP */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-auctorum-white text-center mb-12">
            Roadmap
          </h2>
          <div className="border-l-2 border-auctorum-border ml-1.5">
            {phases.map((phase) => (
              <div key={phase.label} className="relative pl-8 pb-8">
                <div
                  className={`absolute left-[-7px] top-1 w-3 h-3 rounded-full border-2 ${dotStyles[phase.status]}`}
                />
                <p className="font-mono text-xs tracking-wider uppercase text-auctorum-body/60">
                  {phase.label}
                </p>
                <h3 className="text-lg font-bold text-auctorum-white mt-1">{phase.title}</h3>
                <p className="text-sm text-auctorum-body mt-1">{phase.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MANIFIESTO TÉCNICO */}
      <section className="py-20 text-center px-6">
        <div className="max-w-2xl mx-auto">
          <p className="font-serif italic text-xl text-auctorum-light leading-relaxed">
            Todo corre en tu servidor. Modelos open source. Red privada. Cero
            datos saliendo de tu hardware. Costo recurrente cero.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 text-center px-6">
        <div className="flex gap-4 justify-center items-center flex-wrap">
          <a
            href="https://github.com/cocopsn/auctorum-systems"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-auctorum-border px-6 py-3 rounded-lg hover:bg-auctorum-surface-2 text-auctorum-light font-medium transition-colors"
          >
            Ver código en GitHub →
          </a>
          <a
            href="https://github.com/cocopsn/auctorum-systems"
            target="_blank"
            rel="noopener noreferrer"
            className="text-auctorum-blue font-medium hover:underline transition-colors"
          >
            Contribuir →
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
