export const dynamic = 'force-static';

import Link from 'next/link';
import AuctorumLanding from '@/components/landing/AuctorumLanding';
import Image from 'next/image';
import './auctorum-landing.css';
import {
  Stethoscope,
  FileText,
  ArrowRight,
  Brain,
  MessageSquare,
  Shield,
  Building2,
  Sparkles,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-obsidian-1000 text-white">
      {/* AUCTORUM Design System — single-scene scroll-driven hero.
          Provides its own fixed nav, canvas stage, floaters and 800vh scroll spacer. */}
      <AuctorumLanding />

      {/* The downstream sections below render after the 800vh scene scroll spacer.
          No second nav — the landing's own auc-nav lives inside the sticky scene
          and naturally scrolls away when the scene ends. */}
      <div className="relative z-10 bg-obsidian-1000">
      {/* PRODUCTS SECTION */}
      <section id="productos" className="bg-obsidian-1000 px-6 py-24 border-t border-obsidian-700/40">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white">Nuestros Productos</h2>
            <p className="mt-4 text-lg text-slate-300 max-w-2xl mx-auto">Soluciones verticales diseñadas para industrias específicas</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Card 1 - Concierge */}
            <Link href="/systems" className="group relative bg-obsidian-900 rounded-2xl p-8 border border-blue-500/30 hover:border-blue-500/60 transition-all duration-300">
              <span className="inline-block bg-blue-600/20 text-blue-400 text-xs font-semibold px-3 py-1 rounded-full mb-6">PRODUCTO PRINCIPAL</span>
              <div className="w-14 h-14 rounded-xl bg-blue-600/10 flex items-center justify-center mb-6">
                <Stethoscope className="w-7 h-7 text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold text-white">Concierge Médico AI</h3>
              <p className="mt-2 text-sm text-blue-400 font-medium">Para doctores y consultorios</p>
              <p className="mt-4 text-slate-300 leading-relaxed">Plataforma completa para consultorios médicos. WhatsApp AI, gestión de citas, facturación electrónica, y más.</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {['WhatsApp AI', 'Citas', 'Facturación', 'Expedientes'].map(t => (
                  <span key={t} className="text-xs bg-obsidian-800 text-slate-200 px-3 py-1 rounded-full">{t}</span>
                ))}
              </div>
              <div className="mt-6 inline-flex items-center gap-2 text-blue-400 font-semibold text-sm group-hover:gap-3 transition-all">
                Conocer más <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
            {/* Card 2 - Cotizador */}
            <Link href="/platform" className="group bg-obsidian-900 rounded-2xl p-8 border border-obsidian-700 hover:border-obsidian-600 transition-all duration-300">
              <div className="w-14 h-14 rounded-xl bg-obsidian-800 flex items-center justify-center mb-6">
                <FileText className="w-7 h-7 text-slate-300" />
              </div>
              <h3 className="text-2xl font-bold text-white">Motor de Cotizaciones B2B</h3>
              <p className="mt-2 text-sm text-slate-400 font-medium">Para negocios e industria</p>
              <p className="mt-4 text-slate-300 leading-relaxed">Genera cotizaciones profesionales, gestiona catálogos de productos, y automatiza tu proceso de ventas.</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {['PDF Profesional', 'Catálogo', 'CRM', 'Analytics'].map(t => (
                  <span key={t} className="text-xs bg-obsidian-800 text-slate-200 px-3 py-1 rounded-full">{t}</span>
                ))}
              </div>
              <div className="mt-6 inline-flex items-center gap-2 text-slate-300 font-semibold text-sm group-hover:gap-3 transition-all">
                Conocer más <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* TECHNOLOGY SECTION */}
      <section id="tecnologia" className="bg-obsidian-1000 px-6 py-24 border-t border-obsidian-700/40">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white">Construido con tecnología de vanguardia</h2>
            <p className="mt-4 text-lg text-slate-300">Infraestructura enterprise para empresas de cualquier tamaño</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {icon: Brain, title: 'Inteligencia Artificial', desc: 'Modelos de lenguaje que entienden el contexto de tu negocio'},
              {icon: MessageSquare, title: 'WhatsApp Business API', desc: 'Comunicación directa con tus clientes en su canal preferido'},
              {icon: Shield, title: 'Seguridad Enterprise', desc: 'Cifrado AES-256, 2FA, HMAC webhooks, hardening completo'},
              {icon: Building2, title: 'Multi-tenant SaaS', desc: 'Cada cliente con su propio espacio aislado y personalizable'},
            ].map(card => (
              <div key={card.title} className="bg-obsidian-900 rounded-xl p-6 border border-obsidian-700/60 hover:border-blue-500/50 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-lg bg-blue-600/10 flex items-center justify-center mb-4 group-hover:bg-blue-600/20 transition-colors">
                  <card.icon className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{card.title}</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT SECTION */}
      <section id="nosotros" className="bg-obsidian-1000 px-6 py-24 border-t border-obsidian-700/40">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-blue-400 mb-4">Sobre Nosotros</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white">Una empresa construida desde Saltillo para todo México</h2>
          <p className="mt-6 text-lg text-slate-300 leading-relaxed">
            Somos un equipo de ingenieros del Tecnológico de Monterrey construyendo software que transforma cómo operan los negocios. Nuestra misión: que cada profesional tenga acceso a herramientas de IA enterprise.
          </p>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="bg-obsidian-1000 px-6 py-24 border-t border-obsidian-700/40">
        <div className="mx-auto max-w-3xl text-center">
          <Sparkles className="w-10 h-10 text-blue-400 mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold text-white">¿Listo para automatizar tu negocio?</h2>
          <p className="mt-4 text-lg text-slate-400">Comienza hoy.  Sin compromiso.</p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className="rounded-full bg-blue-600 px-8 py-4 text-lg font-medium text-white hover:bg-blue-500 transition-colors">
              Crear mi cuenta
            </Link>
            <a href="mailto:sistema@auctorum.com.mx" className="rounded-full border border-slate-600 px-8 py-4 text-lg font-medium text-slate-300 hover:border-blue-500 hover:text-white transition-colors">
              Contactar ventas
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-obsidian-1000 border-t border-obsidian-700/40 px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pb-8 border-b border-obsidian-700/40">
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Productos</h4>
              <div className="space-y-3">
                <Link href="/systems" className="block text-sm text-slate-300 hover:text-white transition-colors">Concierge Médico</Link>
                <Link href="/platform" className="block text-sm text-slate-300 hover:text-white transition-colors">Cotizador B2B</Link>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Empresa</h4>
              <div className="space-y-3">
                <Link href="/about" className="block text-sm text-slate-300 hover:text-white transition-colors">Sobre Nosotros</Link>
                <a href="mailto:contacto@auctorum.com.mx" className="block text-sm text-slate-300 hover:text-white transition-colors">Contacto</a>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Legal</h4>
              <div className="space-y-3">
                <a href="/privacy" className="block text-sm text-slate-300 hover:text-white transition-colors">Aviso de Privacidad</a>
                <a href="/terms" className="block text-sm text-slate-300 hover:text-white transition-colors">Términos y Condiciones</a>
                <a href="/cookies" className="block text-sm text-slate-300 hover:text-white transition-colors">Política de Cookies</a>
                <a href="/ai-policy" className="block text-sm text-slate-300 hover:text-white transition-colors">Política de IA</a>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Contacto</h4>
              <div className="space-y-3">
                <a href="mailto:contacto@auctorum.com.mx" className="block text-sm text-slate-300 hover:text-white transition-colors">contacto@auctorum.com.mx</a>
                <span className="block text-sm text-slate-400">Saltillo, Coahuila, México</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8">
            <div className="flex items-center gap-3">
              <Image src="/auctorum-mark-azul.png" alt="Auctorum" width={24} height={24} className="h-6 w-auto opacity-70" />
              <span className="text-sm font-bold tracking-widest text-slate-200 uppercase">Auctorum</span>
            </div>
            <p className="text-xs text-slate-400">&copy; 2026 Auctorum. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
}
