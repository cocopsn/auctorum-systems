export const dynamic = 'force-static';

import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';

/* ═══════════════════════════════════════════════════════════
   AUCTORUM SYSTEMS — SaaS Products Portal
   ═══════════════════════════════════════════════════════════ */

export default function SystemsPage() {
  return (
    <div className="min-h-screen bg-auctorum-bg">
      <Navbar activePage="systems" />

      {/* HERO */}
      <section className="py-24 text-center px-6">
        <h1 className="uppercase tracking-wider font-bold text-3xl text-auctorum-white">
          AUCTORUM SYSTEMS
        </h1>
        <p className="font-light text-lg text-auctorum-body mt-4">
          Software Comercial Vertical
        </p>
        <div className="h-0.5 w-24 mx-auto bg-auctorum-green mt-6" />
      </section>

      {/* PRODUCTS */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-2 gap-8">
          {/* Card 1 — Motor de Cotizaciones B2B */}
          <div className="bg-auctorum-surface-1 border border-auctorum-border rounded-2xl p-8">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-auctorum-green" />
              <span className="font-mono text-xs text-auctorum-body">En producción</span>
            </div>
            <h3 className="text-xl font-bold text-auctorum-white mt-4">
              Motor de Cotizaciones B2B
            </h3>
            <p className="text-sm text-auctorum-body leading-relaxed mt-3">
              Portales white-label para proveedores industriales. Catálogo de productos,
              cotizaciones con PDF, tracking en tiempo real, integración WhatsApp.
            </p>
            <div className="flex gap-4 mt-4 text-xs font-mono text-auctorum-body/60">
              <span>Multi-tenant</span>
              <span className="text-auctorum-green">·</span>
              <span>WhatsApp</span>
              <span className="text-auctorum-green">·</span>
              <span>PDF</span>
              <span className="text-auctorum-green">·</span>
              <span>Catálogo</span>
            </div>
            <a
              href="https://demo.auctorum.com.mx"
              target="_blank"
              rel="noopener noreferrer"
              className="text-auctorum-green text-sm font-medium mt-6 inline-block hover:underline"
            >
              Ver demo →
            </a>
          </div>

          {/* Card 2 — Concierge Médico */}
          <div className="bg-auctorum-surface-1 border border-auctorum-border rounded-2xl p-8">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-auctorum-green" />
              <span className="font-mono text-xs text-auctorum-body">En producción</span>
            </div>
            <h3 className="text-xl font-bold text-auctorum-white mt-4">
              Concierge Médico AI
            </h3>
            <p className="text-sm text-auctorum-body leading-relaxed mt-3">
              Portal de agenda para consultorios médicos. Los pacientes agendan citas,
              los doctores gestionan agenda, notas clínicas y expedientes.
            </p>
            <div className="flex gap-4 mt-4 text-xs font-mono text-auctorum-body/60">
              <span>Agenda</span>
              <span className="text-auctorum-green">·</span>
              <span>Portal pacientes</span>
              <span className="text-auctorum-green">·</span>
              <span>Notas clínicas</span>
              <span className="text-auctorum-green">·</span>
              <span>Dashboard</span>
            </div>
            <a
              href="https://dra-martinez.auctorum.com.mx"
              target="_blank"
              rel="noopener noreferrer"
              className="text-auctorum-green text-sm font-medium mt-6 inline-block hover:underline"
            >
              Ver demo →
            </a>
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-auctorum-white text-center mb-12">
            Cómo funciona
          </h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <span className="font-mono text-auctorum-green text-sm">01</span>
              <h3 className="font-bold text-auctorum-white mt-2">Registro</h3>
              <p className="text-sm text-auctorum-body mt-2">
                Creamos tu portal personalizado con tu marca
              </p>
            </div>
            <div>
              <span className="font-mono text-auctorum-green text-sm">02</span>
              <h3 className="font-bold text-auctorum-white mt-2">Configuración</h3>
              <p className="text-sm text-auctorum-body mt-2">
                Subes productos/servicios y configuras precios
              </p>
            </div>
            <div>
              <span className="font-mono text-auctorum-green text-sm">03</span>
              <h3 className="font-bold text-auctorum-white mt-2">En línea</h3>
              <p className="text-sm text-auctorum-body mt-2">
                Tu portal está listo con dominio propio y WhatsApp
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACTO */}
      <section className="py-20 text-center px-6">
        <h2 className="text-xl text-auctorum-white font-semibold">
          ¿Interesado en una solución para tu negocio?
        </h2>
        <a
          href="mailto:contacto@auctorum.com.mx"
          className="bg-auctorum-green text-white px-8 py-3 rounded-lg mt-6 inline-block font-medium hover:opacity-90 transition-opacity"
        >
          Escríbenos →
        </a>
      </section>

      <Footer />
    </div>
  );
}
