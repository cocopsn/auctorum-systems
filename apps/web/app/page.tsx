export const dynamic = 'force-static';

/* ═══════════════════════════════════════════════════════════
   AUCTORUM — Landing Page Premium
   Privacidad. Control. Autoría.
   ═══════════════════════════════════════════════════════════ */

// ─── Icon Components ─────────────────────────────────────

function IconOllama() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <circle cx="9" cy="10" r="1" fill="currentColor" />
      <circle cx="15" cy="10" r="1" fill="currentColor" />
    </svg>
  );
}

function IconOrchestrator() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
      <path d="M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

function IconNetwork() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="3" width="8" height="6" rx="1" />
      <rect x="14" y="3" width="8" height="6" rx="1" />
      <rect x="8" y="15" width="8" height="6" rx="1" />
      <path d="M6 9v3h12V9M12 12v3" />
    </svg>
  );
}

function IconChat() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
    </svg>
  );
}

function IconDesktop() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

function IconHardware() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8" stroke="currentColor" strokeWidth="1.5">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="8" y="8" width="8" height="8" rx="1" />
      <path d="M2 9h2M2 15h2M20 9h2M20 15h2M9 2v2M15 2v2M9 20v2M15 20v2" />
    </svg>
  );
}

// ─── Section: Nav ─────────────────────────────────────────

function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-auctorum-bg/80 border-b border-auctorum-border/50">
      <div className="max-w-7xl mx-auto px-6 md:px-8 flex items-center justify-between h-16">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-auctorum-blue/20 border border-auctorum-blue/30 flex items-center justify-center text-auctorum-blue font-mono font-semibold text-sm">
            A
          </div>
          <span className="font-mono text-sm tracking-[0.2em] uppercase text-auctorum-white">
            Auctorum
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <a href="#vision" className="text-sm text-auctorum-body hover:text-auctorum-white transition-colors">
            Vision
          </a>
          <a href="#stack" className="text-sm text-auctorum-body hover:text-auctorum-white transition-colors">
            Arquitectura
          </a>
          <a href="#ecosystem" className="text-sm text-auctorum-body hover:text-auctorum-white transition-colors">
            Ecosistema
          </a>
          <a
            href="https://github.com/cocopsn/auctorum-systems"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-sm font-medium text-auctorum-white bg-auctorum-surface-2 border border-auctorum-border hover:border-auctorum-blue/50 rounded-lg transition-all"
          >
            GitHub →
          </a>
        </div>

        {/* Mobile menu button */}
        <a
          href="https://github.com/cocopsn/auctorum-systems"
          target="_blank"
          rel="noopener noreferrer"
          className="md:hidden px-4 py-2 text-sm font-medium text-auctorum-white bg-auctorum-surface-2 border border-auctorum-border rounded-lg"
        >
          GitHub →
        </a>
      </div>
    </nav>
  );
}

// ─── Section: Hero ────────────────────────────────────────

function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[800px] h-[500px] glow-radial-lg opacity-30" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-8 text-center">
        {/* Badge */}
        <div className="animate-fade-up inline-flex items-center gap-2 px-4 py-2 rounded-full border border-auctorum-green/30 bg-auctorum-green/10 mb-8">
          <span className="w-2 h-2 rounded-full bg-auctorum-green animate-pulse-dot" />
          <span className="text-xs font-mono text-auctorum-green tracking-wider uppercase">
            En desarrollo activo
          </span>
        </div>

        {/* Headline */}
        <h1 className="animate-fade-up animate-fade-up-delay-1 font-serif italic text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.1] text-auctorum-white mb-6">
          Se el{' '}
          <span className="text-gradient-blue">autor</span>
          {' '}de tu propia
          <br className="hidden sm:block" />
          {' '}inteligencia artificial
        </h1>

        {/* Tagline */}
        <p className="animate-fade-up animate-fade-up-delay-2 font-mono text-xs sm:text-sm tracking-[0.3em] uppercase text-auctorum-body mb-8">
          Privacidad · Control · Autoria
        </p>

        {/* Description */}
        <p className="animate-fade-up animate-fade-up-delay-3 text-base sm:text-lg text-auctorum-body max-w-2xl mx-auto leading-relaxed mb-10">
          Una plataforma de IA personal que corre en tu hardware. Sin suscripciones,
          sin telemetria, sin servidores ajenos. Tus datos nunca salen de tu maquina.
        </p>

        {/* CTAs */}
        <div className="animate-fade-up animate-fade-up-delay-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#stack"
            className="px-8 py-3.5 bg-auctorum-blue hover:bg-auctorum-blue-bright text-auctorum-white font-medium rounded-lg transition-all animate-glow-pulse text-sm"
          >
            Explorar el proyecto
          </a>
          <a
            href="#vision"
            className="px-8 py-3.5 bg-transparent border border-auctorum-border hover:border-auctorum-blue/50 text-auctorum-light font-medium rounded-lg transition-all text-sm"
          >
            Leer la tesis
          </a>
        </div>
      </div>
    </section>
  );
}

// ─── Section: Etimologia ──────────────────────────────────

function Etimologia() {
  return (
    <section className="relative py-20 border-t border-b border-auctorum-border/50">
      <div className="max-w-4xl mx-auto px-6 md:px-8 text-center">
        <p className="animate-fade-up font-serif italic text-2xl sm:text-3xl md:text-4xl text-auctorum-light leading-relaxed">
          &ldquo;Del latin{' '}
          <span className="text-gradient-blue">auctor</span>
          : quien organiza,
          <br className="hidden md:block" />
          {' '}quien hace crecer, quien crea.&rdquo;
        </p>
      </div>
    </section>
  );
}

// ─── Section: La Tesis ────────────────────────────────────

function Tesis() {
  return (
    <section id="vision" className="py-24 md:py-32">
      <div className="max-w-3xl mx-auto px-6 md:px-8">
        <h2 className="animate-fade-up font-serif italic text-3xl sm:text-4xl md:text-5xl text-auctorum-white mb-10 text-center">
          El Linux de las IAs
        </h2>

        <div className="space-y-6 text-auctorum-body leading-relaxed">
          <p className="animate-fade-up animate-fade-up-delay-1">
            Hoy tienes dos opciones para usar IA: pagar una suscripcion mensual a una
            corporacion que almacena tus conversaciones, entrena con tus datos y puede
            cambiar los terminos cuando quiera. O no usar IA.
          </p>

          <p className="animate-fade-up animate-fade-up-delay-2">
            Auctorum crea la tercera opcion. Un sistema completo de IA personal que corre
            en tu propia computadora — modelos de lenguaje locales, orquestacion de agentes,
            memoria persistente, y conexion al mundo real a traves de tus apps.
          </p>

          <p className="animate-fade-up animate-fade-up-delay-3">
            Todo con software libre. Todo en tu hardware. Cero costo recurrente despues
            del setup inicial.
          </p>
        </div>

        {/* Highlight box */}
        <div className="animate-fade-up animate-fade-up-delay-4 mt-10 p-6 rounded-lg bg-auctorum-surface-1 border-l-4 border-auctorum-blue">
          <p className="font-serif italic text-lg sm:text-xl text-auctorum-light leading-relaxed">
            &ldquo;La soberania sobre tu IA personal es tecnicamente viable en hardware de
            consumo — un i3 de 2017, una GPU de 8GB, y software libre.&rdquo;
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── Section: Stack ───────────────────────────────────────

const stackCards = [
  {
    icon: <IconOllama />,
    name: 'Ollama',
    description: 'Runtime local de LLMs. Ejecuta modelos en tu GPU sin dependencias cloud.',
    tag: 'runtime',
  },
  {
    icon: <IconOrchestrator />,
    name: 'OpenClaw',
    description: 'Orquestador de agentes. Define flujos, herramientas y memoria para tus modelos.',
    tag: 'orchestrator',
  },
  {
    icon: <IconNetwork />,
    name: 'Tailscale',
    description: 'Red Zero-Trust. Conecta todos tus dispositivos sin abrir puertos.',
    tag: 'network',
  },
  {
    icon: <IconChat />,
    name: 'WhatsApp',
    description: 'Interfaz de usuario natural. Habla con tu IA desde donde ya estas.',
    tag: 'interface',
  },
  {
    icon: <IconDesktop />,
    name: 'Tauri + Swift',
    description: 'Apps nativas de escritorio y movil. UI rapida sin Electron.',
    tag: 'desktop · ios',
  },
  {
    icon: <IconHardware />,
    name: 'ESP32 / RPi',
    description: 'Hardware de voz. Asistente fisico con wake word y procesamiento local.',
    tag: 'hardware',
  },
];

function Stack() {
  return (
    <section id="stack" className="py-24 md:py-32 bg-auctorum-surface-1">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <div className="text-center mb-16">
          <h2 className="animate-fade-up font-serif italic text-3xl sm:text-4xl text-auctorum-white mb-4">
            Arquitectura
          </h2>
          <p className="animate-fade-up animate-fade-up-delay-1 text-auctorum-body max-w-xl mx-auto">
            Cinco capas que conectan modelos de lenguaje locales con el mundo real del usuario.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {stackCards.map((card, i) => (
            <div
              key={card.name}
              className={`animate-fade-up animate-fade-up-delay-${i + 1} group p-6 rounded-xl bg-auctorum-surface-2 border border-auctorum-border hover:border-auctorum-blue/40 transition-all duration-300`}
            >
              <div className="text-auctorum-blue mb-4 group-hover:text-auctorum-blue-bright transition-colors">
                {card.icon}
              </div>
              <h3 className="text-lg font-semibold text-auctorum-white mb-2">{card.name}</h3>
              <p className="text-sm text-auctorum-body leading-relaxed mb-4">{card.description}</p>
              <span className="font-mono text-xs text-auctorum-blue/70 tracking-wider uppercase">
                {card.tag}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Section: 3 Ramas ─────────────────────────────────────

const branches = [
  {
    name: 'Auctorum',
    subtitle: 'Plataforma',
    description:
      'El proyecto core de IA personal soberana. Open source, modular, disenado para correr en hardware de consumo. El nucleo de todo el ecosistema.',
    color: 'blue' as const,
    link: '#',
    linkText: 'Ver roadmap',
  },
  {
    name: 'Auctorum Systems',
    subtitle: 'SaaS Verticales',
    description:
      'Productos comerciales construidos sobre la infraestructura Auctorum. Motor de Cotizaciones B2B, Concierge Medico AI, y futuros verticales.',
    color: 'green' as const,
    link: 'https://demo.auctorum.com.mx',
    linkText: 'Ver demo',
  },
  {
    name: 'Auctorum Dev',
    subtitle: 'Desarrollo',
    description:
      'Desarrollo a medida, consultoria, y proyectos freelance. La rama que financia las otras dos mientras el ecosistema madura.',
    color: 'purple' as const,
    link: '#',
    linkText: 'Contactar',
  },
];

const branchColors = {
  blue: {
    border: 'border-auctorum-blue/30 hover:border-auctorum-blue/60',
    bg: 'bg-auctorum-blue/5',
    dot: 'bg-auctorum-blue',
    text: 'text-auctorum-blue',
    link: 'text-auctorum-blue hover:text-auctorum-blue-bright',
  },
  green: {
    border: 'border-auctorum-green/30 hover:border-auctorum-green/60',
    bg: 'bg-auctorum-green/5',
    dot: 'bg-auctorum-green',
    text: 'text-auctorum-green',
    link: 'text-auctorum-green hover:text-auctorum-green',
  },
  purple: {
    border: 'border-auctorum-purple/30 hover:border-auctorum-purple/60',
    bg: 'bg-auctorum-purple/5',
    dot: 'bg-auctorum-purple',
    text: 'text-auctorum-purple',
    link: 'text-auctorum-purple hover:text-auctorum-purple',
  },
};

function Branches() {
  return (
    <section id="ecosystem" className="py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <div className="text-center mb-16">
          <h2 className="animate-fade-up font-serif italic text-3xl sm:text-4xl text-auctorum-white mb-4">
            Ecosistema
          </h2>
          <p className="animate-fade-up animate-fade-up-delay-1 text-auctorum-body max-w-xl mx-auto">
            Tres ramas, un objetivo: que la IA que organiza tu vida te pertenezca.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {branches.map((branch, i) => {
            const colors = branchColors[branch.color];
            return (
              <div
                key={branch.name}
                className={`animate-fade-up animate-fade-up-delay-${i + 1} p-8 rounded-xl ${colors.bg} border ${colors.border} transition-all duration-300`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                  <span className={`font-mono text-xs tracking-wider uppercase ${colors.text}`}>
                    {branch.subtitle}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-auctorum-white mb-3">{branch.name}</h3>
                <p className="text-sm text-auctorum-body leading-relaxed mb-6">{branch.description}</p>
                <a
                  href={branch.link}
                  className={`text-sm font-medium ${colors.link} transition-colors`}
                >
                  {branch.linkText} →
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Section: Manifiesto ──────────────────────────────────

function Manifiesto() {
  return (
    <section className="relative py-32 md:py-40 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[1000px] h-[600px] glow-radial-lg opacity-20" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-8 text-center">
        <blockquote className="animate-fade-up font-serif italic text-3xl sm:text-4xl md:text-5xl text-auctorum-white leading-[1.3] mb-12">
          &ldquo;Porque la inteligencia que organiza tu vida
          <br className="hidden sm:block" />
          {' '}debe pertenecerte.&rdquo;
        </blockquote>

        <a
          href="https://github.com/cocopsn/auctorum-systems"
          target="_blank"
          rel="noopener noreferrer"
          className="animate-fade-up animate-fade-up-delay-2 inline-flex px-8 py-3.5 bg-auctorum-blue hover:bg-auctorum-blue-bright text-auctorum-white font-medium rounded-lg transition-all text-sm"
        >
          Unirse al proyecto
        </a>
      </div>
    </section>
  );
}

// ─── Section: Footer ──────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-auctorum-border/50 py-12">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Logo + tagline */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-auctorum-blue/20 border border-auctorum-blue/30 flex items-center justify-center text-auctorum-blue font-mono font-semibold text-xs">
              A
            </div>
            <div>
              <span className="font-mono text-xs tracking-[0.15em] uppercase text-auctorum-light">
                Auctorum
              </span>
              <p className="text-xs text-auctorum-body/60 mt-0.5">
                Privacidad. Control. Autoria.
              </p>
            </div>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-auctorum-body">
            <a
              href="https://github.com/cocopsn/auctorum-systems"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-auctorum-white transition-colors"
            >
              GitHub
            </a>
            <a href="https://demo.auctorum.com.mx" className="hover:text-auctorum-white transition-colors">
              Systems
            </a>
            <a href="#" className="hover:text-auctorum-white transition-colors">
              Dev
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-auctorum-border/30 text-center">
          <p className="text-xs text-auctorum-body/50 font-mono">
            &copy; 2026 Auctorum. BDFL: Armando Flores. Saltillo, Coahuila, MX.
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── Main Page ────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="min-h-screen bg-auctorum-bg grain-overlay">
      <Nav />
      <Hero />
      <Etimologia />
      <Tesis />
      <Stack />
      <Branches />
      <Manifiesto />
      <Footer />
    </div>
  );
}
