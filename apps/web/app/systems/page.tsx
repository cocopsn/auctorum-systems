'use client';

/* =====================================================================
   AUCTORUM SYSTEMS — Concierge Médico Landing
   Dark deep-tech medical · Glassmorphism · Violet/Blue glow
   ===================================================================== */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  Zap,
  Shield,
  Brain,
  MessageCircle,
  Bot,
  Calendar,
  Eye,
  Check,
  ArrowRight,
  Star,
  ChevronDown,
  Sparkles,
  MessageSquare,
  Globe,
  BookOpen,
  BarChart3,
  Lock,
  Menu,
  X,
  Mail,
  Linkedin,
  Rss,
  Phone,
} from 'lucide-react';

/* ---------- shared motion variants ---------- */

const EASE = [0.22, 1, 0.36, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};
const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

/* =====================================================================
   SECTION 1 — NAVBAR
   ===================================================================== */
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { href: '#caracteristicas', label: 'Características' },
    { href: '#planes', label: 'Planes' },
    { href: '#testimonios', label: 'Testimonios' },
    { href: '#faq', label: 'FAQ' },
  ];

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-black/40 backdrop-blur-xl border-b border-white/10'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.4)]">
              <Sparkles className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">
              Auctorum <span className="text-violet-400 font-light">Systems</span>
            </span>
          </Link>

          {/* Center links (desktop) */}
          <div className="hidden md:flex items-center gap-8">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* Right actions */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              Iniciar Sesión
            </Link>
            <Link
              href="/signup"
              className="relative overflow-hidden inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 shadow-[0_0_24px_rgba(124,58,237,0.35)] hover:shadow-[0_0_32px_rgba(124,58,237,0.55)] transition-shadow"
            >
              Comenzar Gratis
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="md:hidden text-white p-2 rounded-lg hover:bg-white/5"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden overflow-hidden border-t border-white/10"
            >
              <div className="flex flex-col gap-1 py-4">
                {links.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={() => setMobileOpen(false)}
                    className="px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg"
                  >
                    {l.label}
                  </a>
                ))}
                <div className="h-px bg-white/10 my-2" />
                <Link
                  href="/login"
                  className="px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg"
                >
                  Iniciar Sesión
                </Link>
                <Link
                  href="/signup"
                  className="mx-4 mt-2 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600"
                >
                  Comenzar Gratis <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}

/* =====================================================================
   SECTION 2 — HERO
   ===================================================================== */
function Hero() {
  return (
    <section className="relative pt-32 md:pt-40 pb-20 md:pb-28 overflow-hidden">
      {/* Background glow orbs */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[40rem] h-[40rem] rounded-full bg-violet-600/20 blur-[120px]" />
        <div className="absolute top-40 -right-40 w-[36rem] h-[36rem] rounded-full bg-blue-600/15 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.08),transparent_70%)]" />
        {/* grid texture */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left column */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="relative z-10"
          >
            <motion.div variants={fadeUp}>
              <span className="inline-flex items-center gap-2 rounded-full bg-violet-500/15 border border-violet-500/30 px-4 py-1.5 text-xs font-medium text-violet-300 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-400" />
                </span>
                Concierge Médico con IA
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="mt-6 text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight text-white leading-[1.05]"
            >
              Tu consultorio con{' '}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-violet-400 via-violet-300 to-blue-400 bg-clip-text text-transparent">
                  inteligencia artificial
                </span>
              </span>{' '}
              las 24 horas
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 text-lg text-gray-300 max-w-xl leading-relaxed"
            >
              Automatiza citas, atiende pacientes por WhatsApp y gestiona tu
              clínica desde un solo panel. Potenciado por IA que aprende de tu
              práctica.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/signup"
                className="group inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-base font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 shadow-[0_0_32px_rgba(124,58,237,0.45)] hover:shadow-[0_0_48px_rgba(124,58,237,0.65)] transition-all hover:-translate-y-0.5"
              >
                Comenzar ahora
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="#como-funciona"
                className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-base font-semibold text-white bg-white/5 border border-white/15 backdrop-blur-md hover:bg-white/10 transition-colors"
              >
                Ver demo
              </a>
            </motion.div>

            {/* Integration logos */}
            <motion.div variants={fadeUp} className="mt-14">
              <p className="text-xs uppercase tracking-widest text-gray-500 mb-4">
                Integrado con
              </p>
              <div className="flex flex-wrap items-center gap-x-8 gap-y-4 text-gray-400">
                <IntegrationBadge label="WhatsApp" />
                <IntegrationBadge label="Google Calendar" />
                <IntegrationBadge label="OpenAI" />
                <IntegrationBadge label="Meta Business" />
              </div>
            </motion.div>
          </motion.div>

          {/* Right column — dashboard mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.2, ease: EASE }}
            className="relative h-[520px] lg:h-[600px]"
          >
            <DashboardMockup />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function IntegrationBadge({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
      <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
      <span className="text-sm font-medium tracking-wide">{label}</span>
    </div>
  );
}

function DashboardMockup() {
  return (
    <div
      className="relative w-full h-full"
      style={{ perspective: '1400px' }}
    >
      {/* Back glow */}
      <div className="absolute inset-8 rounded-3xl bg-gradient-to-br from-violet-600/30 to-blue-600/20 blur-3xl" />

      {/* Main card */}
      <div
        className="absolute inset-0 rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-[#0f1432]/90 to-[#1a0e3a]/90 backdrop-blur-xl shadow-[0_30px_100px_-20px_rgba(124,58,237,0.5)]"
        style={{ transform: 'rotateY(-8deg) rotateX(4deg)' }}
      >
        {/* Top bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-black/20">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
          </div>
          <div className="ml-4 flex-1 h-6 rounded-md bg-white/5 border border-white/10 px-3 flex items-center">
            <span className="text-[10px] text-gray-500 font-mono">
              dra-martinez.auctorum.com.mx/panel
            </span>
          </div>
        </div>

        {/* Content grid */}
        <div className="p-5 space-y-4">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-400">Bienvenida,</div>
              <div className="text-white font-semibold">Dra. Laura Martínez</div>
            </div>
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-600" />
          </div>

          {/* Stats mini */}
          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="Citas hoy" value="14" tone="violet" />
            <MiniStat label="Pacientes" value="342" tone="blue" />
            <MiniStat label="IA activa" value="98%" tone="emerald" />
          </div>

          {/* Chart placeholder */}
          <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-400 font-medium">
                Conversaciones — últimos 7 días
              </span>
              <span className="text-xs text-violet-300">+24%</span>
            </div>
            <svg viewBox="0 0 200 60" className="w-full h-16">
              <defs>
                <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0,45 L25,38 L50,42 L75,25 L100,30 L125,18 L150,22 L175,12 L200,15 L200,60 L0,60 Z"
                fill="url(#g1)"
              />
              <path
                d="M0,45 L25,38 L50,42 L75,25 L100,30 L125,18 L150,22 L175,12 L200,15"
                fill="none"
                stroke="#a78bfa"
                strokeWidth="1.5"
              />
            </svg>
          </div>

          {/* List rows */}
          <div className="space-y-1.5">
            {[
              { name: 'Carlos R.', time: '10:30', status: 'Confirmada' },
              { name: 'María S.', time: '11:15', status: 'IA respondió' },
              { name: 'Diego L.', time: '12:00', status: 'En espera' },
            ].map((row, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg bg-white/[0.02] border border-white/5 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-violet-500/50 to-blue-500/50" />
                  <span className="text-xs text-gray-200">{row.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500">{row.time}</span>
                  <span className="text-[10px] text-violet-300 px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20">
                    {row.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating stat card 1 */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.7, duration: 0.6 }}
        className="absolute -left-4 md:-left-10 top-20 w-44 rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/15 p-4 shadow-[0_10px_40px_rgba(124,58,237,0.3)]"
        style={{ transform: 'rotate(-6deg)' }}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
            <Brain className="w-4 h-4 text-violet-300" />
          </div>
          <span className="text-xs text-gray-400">Resolución IA</span>
        </div>
        <div className="text-2xl font-bold text-white">89%</div>
        <div className="text-[10px] text-emerald-400 mt-1">↑ +12% este mes</div>
      </motion.div>

      {/* Floating stat card 2 */}
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.9, duration: 0.6 }}
        className="absolute -right-4 md:-right-6 bottom-20 w-48 rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/15 p-4 shadow-[0_10px_40px_rgba(59,130,246,0.3)]"
        style={{ transform: 'rotate(5deg)' }}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-blue-300" />
          </div>
          <span className="text-xs text-gray-400">Citas / mes</span>
        </div>
        <div className="text-2xl font-bold text-white">342</div>
        <div className="text-[10px] text-blue-300 mt-1">Google Calendar sync</div>
      </motion.div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'violet' | 'blue' | 'emerald';
}) {
  const toneClass =
    tone === 'violet'
      ? 'text-violet-300 bg-violet-500/10 border-violet-500/20'
      : tone === 'blue'
      ? 'text-blue-300 bg-blue-500/10 border-blue-500/20'
      : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20';
  return (
    <div className={`rounded-lg border px-3 py-2 ${toneClass}`}>
      <div className="text-[9px] uppercase tracking-wider opacity-70">{label}</div>
      <div className="text-lg font-bold text-white mt-0.5">{value}</div>
    </div>
  );
}

/* =====================================================================
   SECTION 3 — FEATURES CORE (3 cards)
   ===================================================================== */
function FeaturesCore() {
  const items = [
    {
      icon: Zap,
      title: 'Eficiencia Total',
      body:
        'Automatiza el 80% de las interacciones con pacientes. Tu asistente IA atiende, agenda y responde las 24 horas.',
      gradient: 'from-violet-500 to-fuchsia-500',
    },
    {
      icon: Shield,
      title: 'Control Completo',
      body:
        'Dashboard unificado para citas, pacientes, conversaciones y reportes. Todo en un solo lugar.',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Brain,
      title: 'IA Personalizada',
      body:
        'Tu asistente aprende de tus documentos, precios y protocolos. Cada respuesta es única a tu práctica.',
      gradient: 'from-violet-500 to-blue-500',
    },
  ];

  return (
    <section id="caracteristicas" className="relative py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={stagger}
          className="text-center max-w-2xl mx-auto"
        >
          <motion.h2
            variants={fadeUp}
            className="text-3xl md:text-5xl font-bold text-white tracking-tight"
          >
            Todo lo que necesita tu clínica
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-gray-400 text-lg">
            Herramientas diseñadas para profesionales de la salud
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="mt-16 grid md:grid-cols-3 gap-6"
        >
          {items.map((item) => (
            <motion.div
              key={item.title}
              variants={fadeUp}
              whileHover={{ y: -6 }}
              className="group relative rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 backdrop-blur-xl p-8 overflow-hidden transition-shadow hover:shadow-[0_0_60px_rgba(124,58,237,0.25)]"
            >
              {/* corner glow */}
              <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-violet-500/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

              <div
                className={`relative w-14 h-14 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-[0_10px_30px_rgba(124,58,237,0.4)]`}
              >
                <item.icon className="w-7 h-7 text-white" strokeWidth={2} />
              </div>
              <h3 className="relative mt-6 text-xl font-bold text-white">
                {item.title}
              </h3>
              <p className="relative mt-3 text-gray-400 leading-relaxed">
                {item.body}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* =====================================================================
   SECTION 4 — CÓMO FUNCIONA (pipeline)
   ===================================================================== */
function HowItWorks() {
  const steps = [
    {
      icon: MessageCircle,
      title: 'Paciente escribe',
      body: 'Por WhatsApp, 24/7',
    },
    {
      icon: Bot,
      title: 'IA responde',
      body: 'Con tu información y protocolos',
    },
    {
      icon: Calendar,
      title: 'Agenda automática',
      body: 'Sincronizada con Google Calendar',
    },
    {
      icon: Eye,
      title: 'Tú supervisas',
      body: 'Dashboard en tiempo real',
    },
  ];

  return (
    <section
      id="como-funciona"
      className="relative py-24 md:py-32 overflow-hidden"
    >
      {/* section background accent */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-950/20 to-transparent" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[60rem] h-[60rem] rounded-full bg-violet-600/10 blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={stagger}
          className="text-center max-w-2xl mx-auto"
        >
          <motion.h2
            variants={fadeUp}
            className="text-3xl md:text-5xl font-bold text-white tracking-tight"
          >
            Así de simple funciona
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-gray-400 text-lg">
            De la conversación al calendario, sin que tengas que mover un dedo.
          </motion.p>
        </motion.div>

        <div className="mt-20 relative">
          {/* Connecting line (desktop) with traveling dot */}
          <div className="hidden md:block absolute top-10 left-[12%] right-[12%] h-px">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500/0 via-violet-500/50 to-violet-500/0" />
            <div className="absolute inset-0 overflow-hidden">
              <div className="pipeline-dot absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-violet-300 shadow-[0_0_12px_rgba(167,139,250,0.9)]" />
            </div>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-4 relative"
          >
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                variants={fadeUp}
                className="relative flex flex-col items-center text-center"
              >
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1a1342] to-[#0f1432] border border-white/10 flex items-center justify-center backdrop-blur-xl shadow-[0_10px_40px_rgba(124,58,237,0.25)]">
                    <step.icon className="w-9 h-9 text-violet-300" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 text-white text-xs font-bold flex items-center justify-center shadow-lg">
                    {i + 1}
                  </span>
                </div>
                <h3 className="mt-6 text-lg font-semibold text-white">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-gray-400 max-w-xs">{step.body}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      <style jsx>{`
        @keyframes pipeline-travel {
          0% {
            left: 0%;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            left: 100%;
            opacity: 0;
          }
        }
        .pipeline-dot {
          animation: pipeline-travel 4s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
}

/* =====================================================================
   SECTION 5 — CARACTERÍSTICAS DETALLADAS (6 cards)
   ===================================================================== */
function FeaturesDetailed() {
  const items = [
    {
      icon: MessageSquare,
      title: 'WhatsApp Business',
      body:
        'Atención automatizada, transferencia a humano cuando hace falta, e historial completo por paciente.',
    },
    {
      icon: Calendar,
      title: 'Agenda Inteligente',
      body:
        'Sincronización bidireccional con Google Calendar. Los cambios se reflejan en segundos.',
    },
    {
      icon: Globe,
      title: 'Portal del Doctor',
      body:
        'Tu mini-sitio con dominio propio: dr-nombre.auctorum.com.mx, listo en 15 minutos.',
    },
    {
      icon: BookOpen,
      title: 'Base de Conocimiento',
      body:
        'Sube PDFs, catálogos y precios. Tu IA los aprende y los usa para responder a pacientes.',
    },
    {
      icon: BarChart3,
      title: 'Reportes y Analytics',
      body:
        'Métricas de citas, conversaciones, ingresos y satisfacción. Decide con datos, no con intuición.',
    },
    {
      icon: Lock,
      title: 'Seguridad Enterprise',
      body:
        'Datos aislados por clínica, cifrado en tránsito y en reposo, cumplimiento LFPDPPP.',
    },
  ];

  return (
    <section className="relative py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={stagger}
          className="text-center max-w-3xl mx-auto"
        >
          <motion.h2
            variants={fadeUp}
            className="text-3xl md:text-5xl font-bold text-white tracking-tight"
          >
            Construido para consultorios.{' '}
            <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
              Diseñado para escalar.
            </span>
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-gray-400 text-lg">
            Cada módulo trabaja en conjunto para que no tengas que pelear contra
            múltiples herramientas.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {items.map((item) => (
            <motion.div
              key={item.title}
              variants={fadeUp}
              whileHover={{ y: -4 }}
              className="group relative rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl p-7 overflow-hidden transition-all hover:border-violet-400/30 hover:shadow-[0_0_50px_rgba(124,58,237,0.2)]"
            >
              <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-violet-500/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center">
                <item.icon className="w-5 h-5 text-violet-300" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-white">
                {item.title}
              </h3>
              <p className="mt-2 text-sm text-gray-400 leading-relaxed">
                {item.body}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* =====================================================================
   SECTION 6 — TESTIMONIALS
   ===================================================================== */
function Testimonials() {
  const items = [
    {
      quote:
        'Desde que implementé Auctorum, mi consultorio atiende 3x más pacientes sin contratar personal adicional.',
      name: 'Dra. Laura Martínez',
      role: 'Dermatóloga',
      city: 'Saltillo',
      initials: 'LM',
      gradient: 'from-pink-500 to-violet-500',
    },
    {
      quote:
        'La IA responde exactamente como yo lo haría. Mis pacientes no notan la diferencia.',
      name: 'Dr. Roberto Garza',
      role: 'Cardiólogo',
      city: 'Monterrey',
      initials: 'RG',
      gradient: 'from-violet-500 to-blue-500',
    },
    {
      quote:
        'El portal con mi dominio propio me da una imagen profesional que antes costaba miles de pesos.',
      name: 'Dra. Ana Pérez',
      role: 'Pediatra',
      city: 'CDMX',
      initials: 'AP',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      quote:
        'La integración con WhatsApp y Google Calendar fue inmediata. En 15 minutos estaba operando.',
      name: 'Dr. Carlos López',
      role: 'Traumatólogo',
      city: 'Guadalajara',
      initials: 'CL',
      gradient: 'from-emerald-500 to-blue-500',
    },
  ];

  return (
    <section id="testimonios" className="relative py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={stagger}
          className="text-center max-w-2xl mx-auto"
        >
          <motion.h2
            variants={fadeUp}
            className="text-3xl md:text-5xl font-bold text-white tracking-tight"
          >
            Lo que dicen nuestros usuarios
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-gray-400 text-lg">
            Médicos reales usando Auctorum Systems en todo México
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="mt-16 grid md:grid-cols-2 gap-6"
        >
          {items.map((t) => (
            <motion.figure
              key={t.name}
              variants={fadeUp}
              whileHover={{ y: -3 }}
              className="relative rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 backdrop-blur-xl p-8 overflow-hidden"
            >
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-violet-500/10 blur-3xl" />

              {/* Stars */}
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>

              <blockquote className="text-gray-200 leading-relaxed text-lg">
                &ldquo;{t.quote}&rdquo;
              </blockquote>

              <figcaption className="mt-6 flex items-center gap-3 pt-6 border-t border-white/10">
                <div
                  className={`w-11 h-11 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center text-white font-semibold text-sm shadow-lg`}
                >
                  {t.initials}
                </div>
                <div>
                  <div className="text-white font-semibold text-sm">
                    {t.name}
                  </div>
                  <div className="text-gray-400 text-xs">
                    {t.role} · {t.city}
                  </div>
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* =====================================================================
   SECTION 7 — PRICING
   ===================================================================== */
function Pricing() {
  const [billing, setBilling] = useState<'mes' | 'ano'>('mes');

  const plans = [
    {
      name: 'Básico',
      monthly: 1500,
      features: [
        'Landing page con dominio propio',
        'WhatsApp Bot básico (FAQ)',
        'Agenda con Google Calendar',
        '5,000 mensajes IA / mes',
        'Soporte por email',
      ],
      featured: false,
    },
    {
      name: 'Pro',
      monthly: 4500,
      features: [
        'Todo lo del Básico',
        'IA con base de conocimiento (PDFs)',
        'Campañas WhatsApp',
        'Reportes avanzados',
        '25,000 mensajes IA / mes',
        'Soporte prioritario',
      ],
      featured: true,
    },
    {
      name: 'Enterprise',
      monthly: 8000,
      features: [
        'Todo lo del Pro',
        'Meta Business propio',
        'API access',
        'Mensajes ilimitados',
        'Onboarding dedicado',
        'SLA 99.9%',
      ],
      featured: false,
    },
  ];

  const price = (m: number) =>
    billing === 'mes' ? m : Math.round(m * 12 * 0.8);

  return (
    <section id="planes" className="relative py-24 md:py-32">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 w-[50rem] h-[50rem] rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={stagger}
          className="text-center max-w-2xl mx-auto"
        >
          <motion.h2
            variants={fadeUp}
            className="text-3xl md:text-5xl font-bold text-white tracking-tight"
          >
            Planes y Precios
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-gray-400 text-lg">
            Elige el plan que se adapte a tu práctica. Cambia o cancela cuando
            quieras.
          </motion.p>

          {/* Billing toggle */}
          <motion.div variants={fadeUp} className="mt-10 inline-flex items-center">
            <div className="relative inline-flex p-1 rounded-full bg-white/5 border border-white/10 backdrop-blur">
              <button
                onClick={() => setBilling('mes')}
                className={`relative z-10 px-6 py-2 text-sm font-medium rounded-full transition-colors ${
                  billing === 'mes' ? 'text-white' : 'text-gray-400'
                }`}
              >
                Mes
              </button>
              <button
                onClick={() => setBilling('ano')}
                className={`relative z-10 px-6 py-2 text-sm font-medium rounded-full transition-colors ${
                  billing === 'ano' ? 'text-white' : 'text-gray-400'
                }`}
              >
                Año <span className="text-xs text-emerald-400 ml-1">-20%</span>
              </button>
              <motion.div
                layout
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className={`absolute top-1 bottom-1 rounded-full bg-gradient-to-r from-violet-600 to-blue-600 shadow-[0_0_20px_rgba(124,58,237,0.5)] ${
                  billing === 'mes' ? 'left-1 right-[50%]' : 'right-1 left-[50%]'
                }`}
              />
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="mt-16 grid lg:grid-cols-3 gap-6 items-stretch"
        >
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              variants={fadeUp}
              className={`relative rounded-3xl p-8 backdrop-blur-xl border overflow-hidden ${
                plan.featured
                  ? 'bg-gradient-to-br from-violet-600/20 to-blue-600/10 border-violet-400/40 shadow-[0_0_60px_rgba(124,58,237,0.3)] lg:scale-[1.03]'
                  : 'bg-white/[0.04] border-white/10'
              }`}
            >
              {plan.featured && (
                <>
                  <div className="absolute -top-24 -right-24 w-56 h-56 rounded-full bg-violet-500/25 blur-3xl" />
                  <span className="absolute top-5 right-5 text-[10px] uppercase tracking-widest font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 px-3 py-1 rounded-full">
                    Más Popular
                  </span>
                </>
              )}

              <div className="relative">
                <h3 className="text-sm uppercase tracking-widest text-gray-400 font-medium">
                  Plan {plan.name}
                </h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-5xl font-bold text-white tracking-tight">
                    ${price(plan.monthly).toLocaleString('es-MX')}
                  </span>
                  <span className="text-gray-400 text-sm">
                    MXN / {billing === 'mes' ? 'mes' : 'año'}
                  </span>
                </div>
                {billing === 'ano' && (
                  <div className="mt-1 text-xs text-emerald-400">
                    Equivalente a ${Math.round(plan.monthly * 0.8).toLocaleString('es-MX')} MXN/mes
                  </div>
                )}

                <ul className="mt-8 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-3 text-sm text-gray-300">
                      <div
                        className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                          plan.featured
                            ? 'bg-gradient-to-br from-violet-500 to-blue-500'
                            : 'bg-white/10'
                        }`}
                      >
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      </div>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/signup"
                  className={`mt-8 w-full inline-flex items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold transition-all ${
                    plan.featured
                      ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-[0_0_30px_rgba(124,58,237,0.5)] hover:shadow-[0_0_40px_rgba(124,58,237,0.7)]'
                      : 'bg-white/5 border border-white/15 text-white hover:bg-white/10'
                  }`}
                >
                  Comenzar con {plan.name}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* =====================================================================
   SECTION 8 — FAQ
   ===================================================================== */
function FAQ() {
  const faqs = [
    {
      q: '¿Qué es Auctorum Systems y cómo funciona?',
      a: 'Auctorum Systems es una plataforma todo-en-uno para consultorios médicos: asistente de IA por WhatsApp, agenda sincronizada con Google Calendar, portal con dominio propio y dashboard de administración. En 15 minutos tu clínica opera 24/7 sin contratar personal adicional.',
    },
    {
      q: '¿Necesito conocimientos técnicos para configurarlo?',
      a: 'No. El onboarding es guiado: respondes un formulario, subes tus documentos, conectas tu WhatsApp y Google Calendar, y el sistema queda operativo. Nuestro equipo te acompaña en cada paso sin costo adicional.',
    },
    {
      q: '¿Puedo usar mi propio número de WhatsApp?',
      a: 'Sí. En el plan Enterprise usas tu Meta Business propio. En Básico y Pro compartes infraestructura optimizada que mantiene tu marca profesional, sin que el paciente note diferencia.',
    },
    {
      q: '¿La IA puede agendar citas automáticamente?',
      a: 'Sí. La IA consulta tu Google Calendar en tiempo real, propone horarios disponibles, confirma con el paciente, y crea el evento automáticamente. Tú recibes notificaciones y puedes aprobar manualmente si prefieres.',
    },
    {
      q: '¿Mis datos están seguros?',
      a: 'Absolutamente. Cada clínica opera en un tenant aislado, los datos se cifran en tránsito (TLS 1.3) y en reposo (AES-256), y cumplimos con la LFPDPPP mexicana. Nunca compartimos información con terceros.',
    },
    {
      q: '¿Qué pasa si quiero cancelar?',
      a: 'Cancelas cuando quieras sin penalización. Mantienes acceso hasta el final del período pagado y exportamos todos tus datos en formato estándar. Sin ataduras, sin trámites incómodos.',
    },
  ];

  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="relative py-24 md:py-32">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={stagger}
          className="text-center"
        >
          <motion.h2
            variants={fadeUp}
            className="text-3xl md:text-5xl font-bold text-white tracking-tight"
          >
            Preguntas Frecuentes
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-gray-400 text-lg">
            Todo lo que quieres saber antes de empezar.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="mt-12 space-y-3"
        >
          {faqs.map((item, i) => {
            const isOpen = open === i;
            return (
              <motion.div
                key={item.q}
                variants={fadeUp}
                className={`rounded-2xl border backdrop-blur-xl overflow-hidden transition-colors ${
                  isOpen
                    ? 'bg-white/[0.06] border-violet-400/30'
                    : 'bg-white/[0.03] border-white/10'
                }`}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 p-6 text-left"
                  aria-expanded={isOpen}
                >
                  <span
                    className={`font-semibold transition-colors ${
                      isOpen ? 'text-white' : 'text-gray-200'
                    }`}
                  >
                    {item.q}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 shrink-0 text-violet-300 transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 text-gray-300 leading-relaxed">
                        {item.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

/* =====================================================================
   SECTION 9 — FINAL CTA
   ===================================================================== */
function FinalCTA() {
  return (
    <section className="relative py-24 md:py-32">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7, ease: EASE }}
          className="relative rounded-3xl overflow-hidden p-12 md:p-20 text-center border border-white/15 backdrop-blur-xl bg-gradient-to-br from-violet-600/30 via-violet-900/20 to-blue-600/30"
        >
          {/* Pulsing glow */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] rounded-full bg-violet-600/30 blur-[120px] cta-pulse" />
          </div>

          {/* Noise overlay */}
          <div
            className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
            style={{
              backgroundImage:
                'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
            }}
          />

          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight">
            Transforma tu consultorio hoy
          </h2>
          <p className="mt-6 text-lg md:text-xl text-gray-200 max-w-2xl mx-auto">
            Únete a los médicos que ya automatizan su práctica con IA.
          </p>

          <Link
            href="/signup"
            className="group mt-10 inline-flex items-center gap-3 rounded-full px-8 py-4 text-base md:text-lg font-semibold text-violet-950 bg-white shadow-[0_0_50px_rgba(255,255,255,0.4)] hover:shadow-[0_0_70px_rgba(255,255,255,0.6)] transition-all hover:-translate-y-0.5"
          >
            Comenzar Gratis
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </Link>
          <p className="mt-5 text-sm text-gray-300">
            Sin tarjeta de crédito. Configuración en 15 minutos.
          </p>
        </motion.div>
      </div>

      <style jsx>{`
        @keyframes cta-pulse {
          0%,
          100% {
            opacity: 0.5;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 0.9;
            transform: translate(-50%, -50%) scale(1.05);
          }
        }
        .cta-pulse {
          animation: cta-pulse 4s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
}

/* =====================================================================
   SECTION 10 — FOOTER
   ===================================================================== */
function Footer() {
  const cols = [
    {
      title: 'Producto',
      links: [
        { label: 'Características', href: '#caracteristicas' },
        { label: 'Planes', href: '#planes' },
        { label: 'Demo', href: '#como-funciona' },
        { label: 'Documentación', href: '/docs' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Aviso de Privacidad', href: '/legal/privacidad' },
        { label: 'Términos', href: '/legal/terminos' },
        { label: 'Política de IA', href: '/legal/ia' },
        { label: 'Seguridad', href: '/legal/seguridad' },
      ],
    },
    {
      title: 'Conecta',
      links: [
        { label: 'WhatsApp', href: 'https://wa.me/5218000000000' },
        { label: 'LinkedIn', href: 'https://linkedin.com' },
        { label: 'Email', href: 'mailto:hola@auctorum.com.mx' },
        { label: 'Blog', href: '/blog' },
      ],
    },
  ];

  return (
    <footer className="relative bg-black/40 border-t border-white/10 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-4 gap-10">
          {/* Brand col */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-bold text-white text-lg">
                Auctorum <span className="text-violet-400 font-light">Systems</span>
              </span>
            </Link>
            <p className="mt-4 text-sm text-gray-400 leading-relaxed">
              Software de gestión inteligente para consultorios médicos. IA
              especializada, hecha en México.
            </p>
            <a
              href="mailto:hola@auctorum.com.mx"
              className="mt-5 inline-flex items-center gap-2 text-sm text-violet-300 hover:text-violet-200"
            >
              <Mail className="w-4 h-4" /> hola@auctorum.com.mx
            </a>
          </div>

          {cols.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-white uppercase tracking-widest">
                {col.title}
              </h4>
              <ul className="mt-5 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-sm text-gray-400 hover:text-violet-300 transition-colors"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-500">
            © 2026 Auctorum Systems. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-3">
            <SocialIcon href="https://wa.me/5218000000000" icon={Phone} label="WhatsApp" />
            <SocialIcon href="https://linkedin.com" icon={Linkedin} label="LinkedIn" />
            <SocialIcon href="mailto:hola@auctorum.com.mx" icon={Mail} label="Email" />
            <SocialIcon href="/blog" icon={Rss} label="Blog" />
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialIcon({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-violet-400/40 hover:bg-violet-500/10 transition-all"
    >
      <Icon className="w-4 h-4" />
    </a>
  );
}

/* =====================================================================
   PAGE ROOT
   ===================================================================== */
export default function SystemsPage() {
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#10103a] to-[#1a0e3a] text-white overflow-hidden">
      {/* Global page ambient */}
      <div className="fixed inset-0 -z-20 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(59,130,246,0.08),transparent_50%)]" />
      </div>

      <Navbar />
      <main>
        <Hero />
        <FeaturesCore />
        <HowItWorks />
        <FeaturesDetailed />
        <Testimonials />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
