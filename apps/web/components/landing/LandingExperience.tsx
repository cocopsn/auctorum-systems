'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  BarChart3,
  Bot,
  Cpu,
  Network,
  Route,
  ShieldCheck,
  Sparkles,
  Waypoints,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

const fadeUp = {
  initial: { opacity: 1, y: 0 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.5, ease: 'easeOut' as const },
};

const clients = ['AUCTORUM SYSTEMS', 'MEDCONCIERGE', 'ZERO-TRUST', 'WHATSAPP AI'];

const featureSlides = [
  {
    eyebrow: 'Sovereign orchestration',
    title: 'Model routing that stays inside your perimeter.',
    body: "Auctorum Platform connects local models, operator rules and action layers so intelligence works inside your own infrastructure, not inside someone else's dashboard.",
    points: ['Local-first reasoning', 'Operator escalation', 'Private automation graph'],
  },
  {
    eyebrow: 'Commercial systems',
    title: 'Public portals built for revenue, not just demos.',
    body: 'Auctorum Systems turns branded experiences into working pipelines: quotes, AI concierge, WhatsApp follow-up, analytics and tenant control from a single stack.',
    points: ['Quote Engine B2B', 'Medical concierge', 'White-label tenant portals'],
  },
  {
    eyebrow: 'Control surface',
    title: 'Security, telemetry and policy live in the same cockpit.',
    body: 'Every interaction can be captured, analyzed and routed through explicit rules, so the system behaves like infrastructure rather than a novelty chatbot.',
    points: ['Audit-friendly events', 'Policy-aware outputs', 'Real-time operational feedback'],
  },
];

const benefits = [
  {
    icon: Route,
    title: 'Link Intelligence',
    body: 'Track journeys across tenant portals, quote links and concierge responses with context-rich events.',
  },
  {
    icon: BarChart3,
    title: 'Real-time analytics',
    body: 'Surface conversion, attendance and response health without flattening operations into vanity metrics.',
  },
  {
    icon: Bot,
    title: 'AI routing',
    body: 'Route questions to models, humans or workflows based on confidence, intent and tenant policy.',
  },
  {
    icon: ShieldCheck,
    title: 'Security layers',
    body: 'Zero-trust posture, tenant boundaries and explicit control over where data moves.',
  },
  {
    icon: Cpu,
    title: 'API-first architecture',
    body: 'Composable route handlers and shared packages keep the stack product-ready and operator-ready.',
  },
  {
    icon: Network,
    title: 'Custom domains',
    body: 'Launch tenant experiences on branded domains without sacrificing orchestration or observability.',
  },
];

const testimonials = [
  {
    quote:
      'Auctorum feels less like buying software and more like installing a private intelligence capability.',
    name: 'Operations Lead',
    company: 'Industrial supplier tenant',
  },
  {
    quote:
      'The medical concierge flow finally looks serious enough for premium patient communication.',
    name: 'Clinical director',
    company: 'Med concierge pilot',
  },
  {
    quote:
      'The combination of AI routing, branded portals and systems thinking is the differentiator.',
    name: 'Technical advisor',
    company: 'Platform review',
  },
];

function SectionShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('relative mx-auto w-full max-w-[1400px] px-6 md:px-10', className)}>
      {children}
    </section>
  );
}

function GlassCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-[28px] border border-white/10 bg-white/[0.06] backdrop-blur-xl shadow-[0_20px_80px_rgba(9,12,30,0.45)]',
        className
      )}
    >
      {children}
    </div>
  );
}

function FloatingVisual() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [8, -8]), {
    stiffness: 120,
    damping: 18,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-10, 10]), {
    stiffness: 120,
    damping: 18,
  });

  return (
    <div
      className="relative mx-auto h-[520px] w-full max-w-[620px] [perspective:1400px]"
      onMouseMove={(event) => {
        const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
        mouseX.set((event.clientX - rect.left) / rect.width - 0.5);
        mouseY.set((event.clientY - rect.top) / rect.height - 0.5);
      }}
      onMouseLeave={() => {
        mouseX.set(0);
        mouseY.set(0);
      }}
    >
      <motion.div style={{ rotateX, rotateY }} className="absolute inset-0">
        <motion.div
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute left-10 top-5 h-16 w-40 rounded-[26px] border border-white/10 bg-white/[0.07] backdrop-blur-xl"
        />
        <motion.div
          animate={{ y: [0, 12, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute right-12 top-0 h-20 w-44 rounded-[28px] border border-white/10 bg-gradient-to-br from-white/10 to-white/[0.02] shadow-[0_0_40px_rgba(168,85,247,0.2)]"
        />

        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 5.8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute left-24 top-20 h-[250px] w-[360px] rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_30%_20%,rgba(216,180,254,0.65),transparent_30%),linear-gradient(160deg,rgba(86,16,126,0.95),rgba(21,12,54,0.88)_55%,rgba(6,10,28,0.96))] p-7 shadow-[0_0_40px_rgba(168,85,247,0.4)]"
        >
          <div className="flex items-center justify-between text-white/80">
            <span className="text-xs uppercase tracking-[0.24em]">Gain full control</span>
            <div className="h-7 w-12 rounded-full bg-white/15 p-1">
              <div className="ml-auto h-5 w-5 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.7)]" />
            </div>
          </div>
          <div className="mt-16 max-w-[220px]">
            <p className="text-3xl font-semibold leading-tight text-white">
              Take control of your sovereign intelligence
            </p>
            <p className="mt-3 text-sm text-white/70">
              Models, routes, follow-up and policy in one controlled surface.
            </p>
          </div>
        </motion.div>

        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 6.2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute left-8 h-36 w-48 rounded-[30px] border border-white/10 bg-gradient-to-br from-fuchsia-300/25 via-white/8 to-transparent backdrop-blur-xl"
          style={{ top: 278 }}
        />
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 5.3, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute right-8 top-[250px] h-40 w-48 rounded-[32px] border border-white/10 bg-[#140f2f]/80 p-5 backdrop-blur-xl"
        >
          <p className="text-sm text-white/70">Boost results</p>
          <p className="mt-2 text-4xl font-semibold text-white">12.5%</p>
          <div className="mt-6 flex h-14 items-end gap-2">
            <span className="h-6 w-6 rounded-t-full bg-white/20" />
            <span className="h-10 w-6 rounded-t-full bg-white/25" />
            <span className="h-8 w-6 rounded-t-full bg-fuchsia-400/80" />
            <span className="h-12 w-6 rounded-t-full bg-fuchsia-300" />
          </div>
        </motion.div>

        <div className="absolute bottom-2 left-14 h-28 w-52 rounded-[30px] border border-white/10 bg-white/[0.05] blur-[1px]" />
        <div className="absolute bottom-0 right-10 h-32 w-56 rounded-[30px] border border-white/10 bg-white/[0.05]" />
      </motion.div>
    </div>
  );
}

function HowNode({
  title,
  body,
  icon: Icon,
  active = false,
}: {
  title: string;
  body: string;
  icon: LucideIcon;
  active?: boolean;
}) {
  return (
    <div className="relative flex min-w-[240px] flex-1 flex-col items-center text-center">
      <div
        className={cn(
          'flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white',
          active && 'shadow-[0_0_30px_rgba(168,85,247,0.45)]'
        )}
      >
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 max-w-[220px] text-sm text-gray-300">{body}</p>
    </div>
  );
}

export function LandingExperience() {
  return (
    <div className="overflow-hidden bg-[#050816] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(168,85,247,0.22),transparent_25%),radial-gradient(circle_at_85%_18%,rgba(96,165,250,0.12),transparent_28%),radial-gradient(circle_at_52%_70%,rgba(124,58,237,0.18),transparent_30%),linear-gradient(180deg,#0b0f2a_0%,#090d21_48%,#050816_100%)]" />

      <SectionShell className="pt-6">
        <GlassCard className="relative overflow-hidden px-6 pb-12 pt-5 md:px-10 md:pb-16 md:pt-7">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(168,85,247,0.26),transparent_24%),radial-gradient(circle_at_82%_62%,rgba(96,165,250,0.14),transparent_26%),linear-gradient(135deg,rgba(13,18,48,0.92),rgba(7,10,28,0.97))]" />
          <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_center,rgba(255,255,255,0.35)_0.8px,transparent_0.9px)] [background-size:28px_28px]" />

          <div className="relative">
            <motion.div {...fadeUp} className="grid items-center gap-12 pt-8 lg:grid-cols-2 lg:pt-14">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-medium text-gray-200">
                  <Sparkles className="h-3.5 w-3.5 text-fuchsia-300" />
                  Sovereign AI for operators, tenants and public portals
                </div>
                <h1 className="mt-8 max-w-[10ch] text-5xl font-semibold leading-[0.94] tracking-[-0.05em] text-white sm:text-6xl lg:text-7xl">
                  Take control of your sovereign intelligence
                </h1>
                <p className="mt-6 max-w-[620px] text-lg leading-8 text-gray-300">
                  Auctorum unifies platform-grade sovereign AI and production software systems:
                  private intelligence infrastructure, branded portals, quote operations and
                  concierge flows built to stay under your control.
                </p>
                <div className="mt-8 flex flex-wrap gap-4">
                  <Link
                    href="/platform"
                    className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_30px_rgba(255,255,255,0.15)]"
                  >
                    Start creating
                    <Sparkles className="h-4 w-4" />
                  </Link>
                  <a
                    href="mailto:contacto@auctorum.com.mx?subject=Request%20a%20demo"
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-6 py-3 text-sm font-semibold text-white backdrop-blur-xl"
                  >
                    Request a demo
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
                <div className="mt-14 flex flex-wrap items-center gap-x-8 gap-y-4 text-sm font-medium tracking-[0.22em] text-white/35">
                  {clients.map((client) => (
                    <span key={client}>{client}</span>
                  ))}
                </div>
              </div>
              <FloatingVisual />
            </motion.div>
          </div>
        </GlassCard>
      </SectionShell>

      <SectionShell className="pt-28">
        <motion.div {...fadeUp}>
          <div className="mb-8">
            <p className="text-sm font-medium text-fuchsia-300">Features Core</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              One operating surface. Multiple layers of control.
            </h2>
          </div>
          <div className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4">
            {featureSlides.map((slide, index) => (
              <GlassCard
                key={slide.title}
                className="min-w-[85vw] snap-center p-8 md:min-w-[78vw] lg:min-w-[72vw]"
              >
                <div className="grid items-center gap-10 lg:grid-cols-[1.1fr,0.9fr]">
                  <div>
                    <p className="text-sm font-medium text-fuchsia-300">{slide.eyebrow}</p>
                    <h3 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                      {slide.title}
                    </h3>
                    <p className="mt-4 max-w-xl text-base leading-8 text-gray-300">
                      {slide.body}
                    </p>
                    <div className="mt-6 space-y-3">
                      {slide.points.map((point) => (
                        <div key={point} className="flex items-center gap-3 text-sm text-gray-200">
                          <span className="h-2 w-2 rounded-full bg-fuchsia-400" />
                          {point}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="relative h-[300px]">
                    <motion.div
                      animate={{ y: [0, -10, 0] }}
                      transition={{
                        duration: 6 + index,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      className="absolute inset-0 rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_30%_20%,rgba(236,72,153,0.28),transparent_30%),linear-gradient(160deg,rgba(15,21,55,0.9),rgba(11,15,42,0.95))] p-6 shadow-[0_0_35px_rgba(168,85,247,0.25)]"
                    >
                      <div className="flex h-full flex-col justify-between rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs uppercase tracking-[0.24em] text-white/55">
                            Auctorum Layer {index + 1}
                          </span>
                          <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
                            Live
                          </span>
                        </div>
                        <div>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="h-16 rounded-2xl bg-white/10" />
                            <div className="h-16 rounded-2xl bg-fuchsia-400/25" />
                            <div className="h-16 rounded-2xl bg-white/10" />
                          </div>
                          <div className="mt-4 h-24 rounded-[22px] bg-gradient-to-r from-fuchsia-400/30 to-cyan-300/20" />
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </motion.div>
      </SectionShell>

      <SectionShell className="pt-28">
        <motion.div {...fadeUp}>
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-medium text-fuchsia-300">Product Depth</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-5xl">
              Built for precision. Designed for control.
            </h2>
            <p className="mt-4 text-base leading-8 text-gray-300">
              The platform layer and the commercial layer share the same philosophy:
              intelligence should be observable, governable and deployable without
              surrendering operational ownership.
            </p>
          </div>
          <div className="relative mt-14 h-[520px]">
            <motion.div
              animate={{ rotate: [0, 4, 0, -4, 0] }}
              transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-[40px] border border-white/10 bg-white/[0.07] shadow-[0_0_80px_rgba(168,85,247,0.22)] backdrop-blur-xl"
            />
            <motion.div
              animate={{ y: [0, -16, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute left-[12%] top-[28%] w-64 rounded-[28px] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl"
            >
              <p className="text-xs uppercase tracking-[0.24em] text-white/50">Policy mesh</p>
              <p className="mt-3 text-lg font-semibold text-white">
                Rules, escalations and tenant boundaries move with the workflow.
              </p>
            </motion.div>
            <motion.div
              animate={{ y: [0, 14, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute right-[10%] top-[18%] w-56 rounded-[28px] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl"
            >
              <p className="text-xs uppercase tracking-[0.24em] text-white/50">Signal layer</p>
              <p className="mt-3 text-lg font-semibold text-white">
                Quotes, messages and patient interactions become structured intelligence.
              </p>
            </motion.div>
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute bottom-[15%] left-[18%] w-60 rounded-[28px] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl"
            >
              <p className="text-xs uppercase tracking-[0.24em] text-white/50">Systems layer</p>
              <p className="mt-3 text-lg font-semibold text-white">
                Tenant portals, white-label operations and deployment paths stay in sync.
              </p>
            </motion.div>
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 8.5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute bottom-[10%] right-[16%] w-64 rounded-[28px] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl"
            >
              <p className="text-xs uppercase tracking-[0.24em] text-white/50">
                Operator cockpit
              </p>
              <p className="mt-3 text-lg font-semibold text-white">
                Admins can see behavior, tune prompts and control live intelligence with
                context.
              </p>
            </motion.div>
          </div>
        </motion.div>
      </SectionShell>

      <SectionShell className="pt-28">
        <motion.div {...fadeUp}>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium text-fuchsia-300">Benefits</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Deep-tech capability, framed like infrastructure.
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {benefits.map((benefit) => (
              <motion.div key={benefit.title} whileHover={{ y: -8 }} className="group">
                <GlassCard className="h-full p-6 transition duration-300 group-hover:border-fuchsia-300/25 group-hover:shadow-[0_0_40px_rgba(168,85,247,0.26)]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.07] text-fuchsia-300">
                    <benefit.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-white">{benefit.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-gray-300">{benefit.body}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </SectionShell>

      <SectionShell className="pt-28">
        <motion.div {...fadeUp}>
          <div id="tech-breakdown" className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium text-fuchsia-300">Tech Breakdown</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              How the pipeline moves from signal to action.
            </h2>
          </div>
          <div className="mt-14">
            <GlassCard className="overflow-hidden p-8 md:p-10">
              <div className="relative flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
                <div className="pointer-events-none absolute left-[8%] right-[8%] top-7 hidden h-px bg-gradient-to-r from-transparent via-fuchsia-400/60 to-transparent lg:block" />
                <motion.div
                  animate={{ x: ['0%', '100%'] }}
                  transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
                  className="absolute top-[23px] hidden h-3 w-3 rounded-full bg-fuchsia-300 shadow-[0_0_16px_rgba(216,180,254,0.8)] lg:block"
                  style={{ left: '10%' }}
                />
                <HowNode
                  title="Capture Data"
                  body="Portal events, operator actions, conversations and tenant context enter the graph."
                  icon={Waypoints}
                  active
                />
                <HowNode
                  title="Analyze Behavior"
                  body="Auctorum classifies intent, health, risk and conversion patterns in real time."
                  icon={BarChart3}
                />
                <HowNode
                  title="Apply Rules"
                  body="Policy, routing and escalation layers decide where intelligence should move next."
                  icon={ShieldCheck}
                />
                <HowNode
                  title="Output"
                  body="Generate a quote, trigger a concierge reply or route to a human operator."
                  icon={ArrowRight}
                />
              </div>
            </GlassCard>
          </div>
        </motion.div>
      </SectionShell>

      <SectionShell className="pt-28">
        <motion.div {...fadeUp}>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium text-fuchsia-300">Social Proof</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Signals from people who care about control, not hype.
            </h2>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                animate={{ y: [0, index % 2 === 0 ? -8 : 8, 0] }}
                transition={{ duration: 7 + index, repeat: Infinity, ease: 'easeInOut' }}
              >
                <GlassCard className="h-full p-6">
                  <p className="text-base leading-8 text-gray-200">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                  <div className="mt-8">
                    <p className="text-sm font-semibold text-white">{testimonial.name}</p>
                    <p className="mt-1 text-sm text-gray-400">{testimonial.company}</p>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </SectionShell>

      <SectionShell className="pb-24 pt-28">
        <motion.div {...fadeUp}>
          <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_30%_30%,rgba(168,85,247,0.35),transparent_32%),radial-gradient(circle_at_75%_60%,rgba(59,130,246,0.28),transparent_35%),linear-gradient(135deg,rgba(39,8,76,0.98),rgba(12,16,45,0.96))] px-8 py-16 text-center shadow-[0_0_80px_rgba(168,85,247,0.24)] md:px-16">
            <motion.div
              animate={{ opacity: [0.35, 0.8, 0.35] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.12),transparent_45%)]"
            />
            <div className="relative">
              <p className="text-sm font-medium text-fuchsia-200">Auctorum</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-tight text-white md:text-5xl">
                Take control. Or stay invisible.
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-gray-200">
                Build with sovereign intelligence, branded systems and operator-grade
                visibility instead of renting surface-level automation.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/platform"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_32px_rgba(255,255,255,0.2)]"
                >
                  Start creating
                  <Sparkles className="h-4 w-4" />
                </Link>
                <Link
                  href="/systems"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-7 py-3 text-sm font-semibold text-white backdrop-blur-xl"
                >
                  Explore systems
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </SectionShell>

      <footer className="pb-12">
        <SectionShell>
          <div className="flex flex-col items-center justify-between gap-5 rounded-[26px] border border-white/10 bg-white/[0.04] px-6 py-6 text-sm text-gray-400 backdrop-blur-xl md:flex-row">
            <div className="flex items-center gap-3">
              <Image
                src="/AUCTORUMMORADO.png"
                alt="Auctorum"
                width={28}
                height={28}
                className="h-7 w-auto"
              />
              <span className="font-medium text-gray-200">Auctorum</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6">
              <Link href="/systems" className="hover:text-white">
                Systems
              </Link>
              <Link href="/platform" className="hover:text-white">
                Platform
              </Link>
              <a href="mailto:contacto@auctorum.com.mx" className="hover:text-white">
                contacto@auctorum.com.mx
              </a>
            </div>
          </div>
        </SectionShell>
      </footer>
    </div>
  );
}
