export const dynamic = 'force-static';

import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';

/* ═══════════════════════════════════════════════════════════
   AUCTORUM SYSTEMS — Products Page v3
   ═══════════════════════════════════════════════════════════ */

export default function SystemsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <Navbar activePage="systems" />

      {/* Header */}
      <section className="pt-20 pb-16 text-center px-6">
        <div className="inline-flex items-center gap-2 bg-[var(--accent-muted)] text-[var(--accent)] text-xs font-medium px-3 py-1 rounded-full mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
          2 productos en producción
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] tracking-tight">
          Auctorum Systems
        </h1>
        <p className="text-base text-[var(--text-secondary)] mt-4 max-w-xl mx-auto">
          Software comercial vertical para industrias específicas
        </p>
      </section>

      {/* Products */}
      <section className="pb-24 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6">
          {/* Motor de Cotizaciones B2B */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-8 hover:border-[var(--border-hover)] transition-colors">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-[var(--accent-muted)] flex items-center justify-center">
                <svg className="w-5 h-5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--success)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                En producción
              </span>
            </div>

            <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-5">
              Motor de Cotizaciones B2B
            </h3>

            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mt-2">
              Portales white-label para proveedores industriales. Catálogo de productos,
              cotizaciones con PDF, tracking en tiempo real, integración WhatsApp.
            </p>

            <div className="flex flex-wrap gap-2 mt-4">
              {['Multi-tenant', 'WhatsApp', 'PDF', 'Catálogo'].map((tag) => (
                <span
                  key={tag}
                  className="text-xs font-mono text-[var(--text-tertiary)] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>

            <a
              href="https://demo.auctorum.com.mx"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-[var(--accent)] text-sm font-medium mt-6 hover:text-[var(--accent-hover)] transition-colors"
            >
              Ver demo &rarr;
            </a>
          </div>

          {/* Concierge Médico */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-8 hover:border-[var(--border-hover)] transition-colors">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-[var(--accent-muted)] flex items-center justify-center">
                <svg className="w-5 h-5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                </svg>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--success)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                En producción
              </span>
            </div>

            <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-5">
              Concierge Médico AI
            </h3>

            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mt-2">
              Portal de agenda para consultorios médicos. Los pacientes agendan citas,
              los doctores gestionan agenda, notas clínicas y expedientes.
            </p>

            <div className="flex flex-wrap gap-2 mt-4">
              {['Agenda', 'Portal pacientes', 'Notas clínicas', 'Dashboard'].map((tag) => (
                <span
                  key={tag}
                  className="text-xs font-mono text-[var(--text-tertiary)] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>

            <a
              href="https://dra-martinez.auctorum.com.mx"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-[var(--accent)] text-sm font-medium mt-6 hover:text-[var(--accent-hover)] transition-colors"
            >
              Ver demo &rarr;
            </a>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="pb-24 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold text-[var(--text-primary)] text-center mb-12">
            Cómo funciona
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Registro', desc: 'Creamos tu portal personalizado con tu marca' },
              { step: '02', title: 'Configuración', desc: 'Subes productos o servicios y configuras precios' },
              { step: '03', title: 'En línea', desc: 'Tu portal está listo con dominio propio y WhatsApp' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[var(--accent-muted)] text-[var(--accent)] font-mono text-sm font-semibold">
                  {item.step}
                </span>
                <h3 className="font-semibold text-[var(--text-primary)] mt-3">{item.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] mt-2">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-24 text-center px-6">
        <h2 className="text-xl text-[var(--text-primary)] font-semibold">
          ¿Interesado en una solución para tu negocio?
        </h2>
        <a
          href="mailto:contacto@auctorum.com.mx"
          className="inline-block bg-[var(--accent)] text-white px-6 py-2.5 rounded-lg mt-6 text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors"
        >
          Escríbenos &rarr;
        </a>
      </section>

      <Footer />
    </div>
  );
}
