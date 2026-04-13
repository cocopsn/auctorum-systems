export const dynamic = 'force-static';

import Link from 'next/link';
import Image from 'next/image';
import { GraduationCap, Rocket, Award, Trophy, Shield, Code, Stethoscope, Mic, Handshake, TrendingUp } from 'lucide-react';

const credentials = [
  {
    icon: GraduationCap,
    title: 'BaseCamp Scholar',
    subtitle: 'Instituto Eugenio Garza Sada — Tecnológico de Monterrey',
  },
  {
    icon: Rocket,
    title: 'Santander Emprendimiento',
    subtitle: 'Beca Entrepreneurial, Fashion & Media Experience — Fase I',
  },
  {
    icon: Award,
    title: 'Oracle Mindshare Scholar',
    subtitle: 'OCI AI Foundations Associate Certified',
  },
  {
    icon: Trophy,
    title: 'Hall of Fame Award',
    subtitle: 'National Hispanic Institute',
  },
  {
    icon: Shield,
    title: 'AI Security & Red Teaming',
    subtitle: 'Dirección profesional en ciberseguridad ofensiva e inteligencia artificial',
  },
  {
    icon: Code,
    title: 'Software Developer',
    subtitle: 'Next.js, React, Node.js, Python, PostgreSQL, Supabase, OpenAI',
  },
];

const marcoCredentials = [
  {
    icon: Stethoscope,
    title: 'Medicina UAdeC',
    subtitle: 'Facultad de Medicina — Universidad Autónoma de Coahuila',
  },
  {
    icon: Mic,
    title: 'MVP Internacional Oratoria',
    subtitle: 'Reconocido a nivel internacional y colegial en comunicación estratégica',
  },
  {
    icon: Handshake,
    title: 'Dirección Comercial Médica',
    subtitle: 'Adquisición de clientes y validación en entornos clínicos reales',
  },
  {
    icon: TrendingUp,
    title: 'Expansión por Red Profesional',
    subtitle: 'Crecimiento sostenible a través de confianza e implementación precisa',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes fadeInUp {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in-up {
              animation: fadeInUp 0.7s ease-out both;
            }
            .anim-d1 { animation-delay: 0.1s; }
            .anim-d2 { animation-delay: 0.2s; }
            .anim-d3 { animation-delay: 0.3s; }
            .anim-d4 { animation-delay: 0.4s; }
            .anim-d5 { animation-delay: 0.5s; }
            .anim-d6 { animation-delay: 0.6s; }
          `,
        }}
      />

      {/* NAV BAR */}
      <nav className="sticky top-0 z-50 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.png" alt="Auctorum" width={36} height={36} className="h-9 w-auto" />
            <span className="text-sm font-bold tracking-widest text-white uppercase">Auctorum</span>
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <Link href="/#productos" className="text-sm text-slate-400 hover:text-white transition-colors">Productos</Link>
            <Link href="/#tecnologia" className="text-sm text-slate-400 hover:text-white transition-colors">Tecnología</Link>
            <Link href="/about" className="text-sm text-white font-medium transition-colors">Sobre Nosotros</Link>
            <Link href="/login" className="text-sm text-slate-300 hover:text-white transition-colors">Iniciar Sesión</Link>
          </div>
          <Link href="/signup" className="hidden rounded-full bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors md:inline-flex">
            Comenzar
          </Link>
        </div>
      </nav>

      {/* Dot pattern background */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(rgb(148 163 184) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      {/* SECTION 1: HERO DEL FUNDADOR */}
      <section className="relative overflow-hidden bg-slate-950 px-6 py-20 md:py-32">
        <div className="relative mx-auto max-w-7xl">
          <div className="grid items-center gap-12 md:grid-cols-2">
            {/* Text — left column */}
            <div className="animate-fade-in-up order-2 md:order-1">
              <p className="mb-6 font-mono text-sm uppercase tracking-widest text-blue-400">
                {'// Fundador & CEO'}
              </p>
              <h1 className="leading-none">
                <span className="block text-7xl font-bold text-white md:text-8xl">Armando</span>
                <span className="block bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-7xl font-bold text-transparent md:text-8xl">
                  Flores
                </span>
              </h1>
              <p className="mt-4 text-xl text-slate-400">
                Ingeniero en Tecnologías Computacionales
              </p>
              <p className="text-lg text-blue-400/80">Tecnológico de Monterrey</p>
            </div>

            {/* Image — right column */}
            <div className="animate-fade-in-up anim-d2 relative order-1 flex justify-center md:order-2">
              <div className="relative">
                {/* Subtle radial glow behind image */}
                <div
                  className="absolute -inset-12"
                  style={{
                    background: 'radial-gradient(ellipse at center, rgba(37,99,235,0.08) 0%, transparent 70%)',
                  }}
                />
                <img
                  src="/founder.png"
                  alt="Armando Flores — Fundador de Auctorum"
                  className="relative z-10 mx-auto h-auto w-full max-w-md md:max-w-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: SOBRE EL FUNDADOR */}
      <section className="relative bg-slate-950 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="animate-fade-in-up">
            <p className="mb-4 font-mono text-sm uppercase tracking-widest text-blue-400">
              {'// Sobre el Fundador'}
            </p>
            <h2 className="mb-10 text-4xl font-bold text-white">
              Construyendo el futuro digital de México
            </h2>
          </div>
          <div className="animate-fade-in-up anim-d1 max-w-3xl space-y-6 text-lg leading-relaxed text-slate-300">
            <p>
              AUCTORUM nació de una convicción: la inteligencia artificial y la automatización no
              deberían ser exclusivas de las grandes corporaciones. Armando Flores, estudiante de
              Ingeniería en Tecnologías Computacionales en el Tecnológico de Monterrey, fundó
              AUCTORUM como desarrollador único con el objetivo de democratizar la tecnología que
              transforma negocios.
            </p>
            <p>
              A los 18 años, diseñó y desplegó dos productos en producción: AUCTORUM Platform, un
              ecosistema de IA soberana con inferencia local en GPU y agentes autónomos que opera
              dentro de la infraestructura del cliente; y AUCTORUM Systems, una plataforma SaaS
              multi-tenant que automatiza operaciones comerciales y médicas mediante WhatsApp,
              inteligencia artificial, y dashboards de analítica en tiempo real.
            </p>
            <p>
              Su trayectoria combina desarrollo de software, ciberseguridad, e inteligencia
              artificial aplicada. Becario del programa BaseCamp del Instituto Eugenio Garza Sada,
              becario Santander de Emprendimiento, y Oracle Mindshare Scholar con certificación OCI
              AI Foundations Associate.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 3: CREDENCIALES Y RECONOCIMIENTOS */}
      <section className="relative bg-slate-950 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="animate-fade-in-up">
            <p className="mb-4 font-mono text-sm uppercase tracking-widest text-blue-400">
              {'// Credenciales'}
            </p>
            <h2 className="mb-12 text-4xl font-bold text-white">Reconocimientos</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {credentials.map((cred, i) => (
              <div
                key={cred.title}
                className={`animate-fade-in-up anim-d${i + 1} group rounded-xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur transition-all duration-300 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10`}
              >
                <cred.icon className="mb-3 h-8 w-8 text-blue-400" />
                <h3 className="text-lg font-semibold text-white">{cred.title}</h3>
                <p className="mt-1 text-sm text-slate-400">{cred.subtitle}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEPARADOR VISUAL */}
      <div className="relative py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="relative flex items-center justify-center">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
            <div className="mx-6 flex items-center gap-2">
              <div className="h-1.5 w-1.5 rotate-45 bg-blue-500" />
              <Image src="/logo.png" alt="" width={20} height={20} className="h-5 w-auto opacity-40" />
              <div className="h-1.5 w-1.5 rotate-45 bg-blue-500" />
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
          </div>
        </div>
      </div>

      {/* SECTION 4: HERO MARCO ESPINOSA */}
      <section className="relative overflow-hidden bg-slate-950 px-6 py-20 md:py-32">
        <div className="relative mx-auto max-w-7xl">
          <div className="grid items-center gap-12 md:grid-cols-2">
            {/* Image — left column (invertido respecto a Armando) */}
            <div className="animate-fade-in-up relative order-1 flex justify-center">
              <div className="relative">
                {/* Subtle radial glow behind image */}
                <div
                  className="absolute -inset-12"
                  style={{
                    background: 'radial-gradient(ellipse at center, rgba(37,99,235,0.08) 0%, transparent 70%)',
                  }}
                />
                <img
                  src="/cofounder.png"
                  alt="Marco Espinosa — Dirección Comercial Médica de Auctorum"
                  className="relative z-10 mx-auto h-auto w-full max-w-sm md:max-w-md"
                />
              </div>
            </div>

            {/* Text — right column */}
            <div className="animate-fade-in-up anim-d2 order-2">
              <p className="mb-6 font-mono text-sm uppercase tracking-widest text-blue-400">
                {'// Dirección Comercial Médica'}
              </p>
              <h2 className="leading-none">
                <span className="block text-6xl font-bold text-white md:text-7xl">Marco</span>
                <span className="block bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-6xl font-bold text-transparent md:text-7xl">
                  Espinosa
                </span>
              </h2>
              <p className="mt-4 text-xl text-slate-400">Facultad de Medicina</p>
              <p className="text-lg text-blue-400/80">Universidad Autónoma de Coahuila</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: SOBRE MARCO */}
      <section className="relative bg-slate-950 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="animate-fade-in-up">
            <p className="mb-4 font-mono text-sm uppercase tracking-widest text-blue-400">
              {'// Sobre Marco'}
            </p>
            <h2 className="mb-10 text-4xl font-bold text-white">
              Liderando la expansión médica
            </h2>
          </div>
          <div className="animate-fade-in-up anim-d1 max-w-3xl space-y-6 text-lg leading-relaxed text-slate-300">
            <p>
              Marco Espinosa lidera la dirección comercial de la rama médica de AUCTORUM,
              enfocándose en la implementación, validación y expansión del sistema dentro del
              sector salud.
            </p>
            <p>
              Es estudiante de la Facultad de Medicina de la Universidad Autónoma de Coahuila,
              una de las instituciones públicas con mayor exigencia académica en la región, con
              un proceso de admisión altamente competitivo y posicionamiento constante entre las
              10 instituciones públicas con mejor desempeño en el ENARM a nivel nacional.
            </p>
            <p>
              Su formación se complementa con experiencia en comunicación estratégica, siendo
              reconocido con un MVP internacional en oratoria y a nivel colegial, lo que
              fortalece su capacidad para estructurar, transmitir y posicionar soluciones en
              entornos profesionales.
            </p>
            <p>
              Dentro de AUCTORUM, es responsable de la adquisición de clientes, desarrollo de
              relaciones con profesionales de la salud y validación del producto en entornos
              clínicos reales, asegurando que la tecnología no solo funcione, sino que se adapte
              a la práctica médica cotidiana.
            </p>
            <p>
              Su enfoque se centra en construir crecimiento sostenible a través de confianza,
              implementación precisa y expansión por red profesional, posicionando la solución
              como una herramienta operativa real dentro del ecosistema médico.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 6: CREDENCIALES DE MARCO */}
      <section className="relative bg-slate-950 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="animate-fade-in-up">
            <p className="mb-4 font-mono text-sm uppercase tracking-widest text-blue-400">
              {'// Credenciales'}
            </p>
            <h2 className="mb-12 text-4xl font-bold text-white">Perfil Profesional</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {marcoCredentials.map((cred, i) => (
              <div
                key={cred.title}
                className={`animate-fade-in-up anim-d${i + 1} group rounded-xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur transition-all duration-300 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10`}
              >
                <cred.icon className="mb-3 h-8 w-8 text-blue-400" />
                <h3 className="text-lg font-semibold text-white">{cred.title}</h3>
                <p className="mt-1 text-sm text-slate-400">{cred.subtitle}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 7: NUESTRA HISTORIA */}
      <section className="relative bg-slate-950 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="animate-fade-in-up">
            <p className="mb-4 font-mono text-sm uppercase tracking-widest text-blue-400">
              {'// Nuestra Historia'}
            </p>
            <h2 className="mb-10 text-4xl font-bold text-white">
              De una pregunta a dos productos en producción
            </h2>
          </div>
          <div className="animate-fade-in-up anim-d1 max-w-3xl space-y-6 text-lg leading-relaxed text-slate-300">
            <p>
              AUCTORUM comenzó como una pregunta: ¿por qué las empresas deben entregar sus datos y
              su inteligencia a infraestructuras que no controlan? De esa pregunta nació AUCTORUM
              Platform — un ecosistema de inteligencia artificial soberana donde los modelos corren
              localmente, las reglas las define el operador, y los datos nunca salen de tu
              infraestructura.
            </p>
            <p>
              La visión se expandió rápidamente. Del ecosistema de IA privado nació AUCTORUM
              Systems: una plataforma SaaS multi-tenant que convierte la operación de cualquier
              negocio en un pipeline digital automatizado. Cotizaciones inteligentes con generación
              de PDF en un click. Un concierge médico con IA que agenda citas 24/7 vía WhatsApp.
              Dashboards de analítica que muestran el estado de tu negocio en una pantalla.
            </p>
            <p>
              Hoy, AUCTORUM opera con dos productos en producción, un vertical médico activo con
              presencia en el sector hospitalario de Saltillo, y una arquitectura diseñada para
              escalar a nivel nacional.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 8: VISIÓN */}
      <section className="relative bg-slate-950 px-6 py-24">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mx-auto mb-10 w-20 border-t-2 border-blue-500" />
          <p className="animate-fade-in-up text-3xl font-light italic text-white md:text-4xl">
            &ldquo;AUCTORUM construye el futuro digital de tu negocio. Software, IA, y
            automatización diseñados para operar dentro de tu mundo.&rdquo;
          </p>
          <div className="mx-auto mt-10 w-20 border-t-2 border-blue-500" />
        </div>
      </section>

      {/* SECTION 9: CTA */}
      <section className="bg-gradient-to-b from-slate-950 via-blue-950/30 to-slate-950 px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="animate-fade-in-up text-3xl font-bold text-white md:text-4xl">
            ¿Listo para transformar tu negocio?
          </h2>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/"
              className="rounded-full bg-blue-600 px-8 py-4 text-lg font-medium text-white transition-colors hover:bg-blue-500"
            >
              Explorar Productos
            </Link>
            <a
              href="mailto:sistema@auctorum.com.mx"
              className="rounded-full border border-slate-600 px-8 py-4 text-lg font-medium text-slate-300 transition-colors hover:border-blue-500 hover:text-white"
            >
              Contactar
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 bg-slate-950 px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-2 gap-8 border-b border-slate-800 pb-8 md:grid-cols-4">
            <div>
              <h4 className="mb-4 text-sm font-semibold text-white">Productos</h4>
              <div className="space-y-3">
                <Link href="/systems" className="block text-sm text-slate-400 transition-colors hover:text-white">Concierge Médico</Link>
                <Link href="/platform" className="block text-sm text-slate-400 transition-colors hover:text-white">Cotizador B2B</Link>
              </div>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-semibold text-white">Empresa</h4>
              <div className="space-y-3">
                <Link href="/about" className="block text-sm text-slate-400 transition-colors hover:text-white">Sobre Nosotros</Link>
                <a href="mailto:sistema@auctorum.com.mx" className="block text-sm text-slate-400 transition-colors hover:text-white">Contacto</a>
              </div>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-semibold text-white">Legal</h4>
              <div className="space-y-3">
                <span className="block text-sm text-slate-500">Aviso de Privacidad</span>
                <span className="block text-sm text-slate-500">Términos de Servicio</span>
              </div>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-semibold text-white">Contacto</h4>
              <div className="space-y-3">
                <a href="mailto:sistema@auctorum.com.mx" className="block text-sm text-slate-400 transition-colors hover:text-white">sistema@auctorum.com.mx</a>
                <span className="block text-sm text-slate-500">Saltillo, Coahuila, México</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-4 pt-8 md:flex-row">
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="Auctorum" width={24} height={24} className="h-6 w-auto opacity-70" />
              <span className="text-sm font-bold uppercase tracking-widest text-slate-300">Auctorum</span>
            </div>
            <p className="text-xs text-slate-500">&copy; 2026 Auctorum. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
