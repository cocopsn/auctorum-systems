export const dynamic = 'force-static';

import Link from 'next/link';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { FileText, MessageSquare, BarChart3, Globe, ArrowRight } from 'lucide-react';

export default function PlatformPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar activePage="platform" />

      {/* Medical Banner */}
      <div className="bg-blue-50 border-b border-blue-100">
        <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-center gap-2 text-sm">
          <span className="text-blue-800">¿Eres doctor? Conoce nuestro Concierge Médico</span>
          <Link href="/systems" className="inline-flex items-center gap-1 text-blue-600 font-semibold hover:text-blue-800 transition-colors">
            Ver más <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Hero */}
      <section className="py-20 px-6 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
          Motor de Cotizaciones B2B
        </h1>
        <p className="text-lg text-slate-500 mt-4 max-w-xl mx-auto">
          Portales white-label para proveedores industriales. Cotizaciones profesionales en minutos.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link href="/signup" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
            Crear cuenta
          </Link>
          <a href="https://demo.auctorum.com.mx" target="_blank" rel="noopener noreferrer" className="border border-slate-300 text-slate-700 px-6 py-3 rounded-lg font-medium hover:bg-slate-50 transition-colors">
            Ver demo
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="mx-auto max-w-5xl grid md:grid-cols-2 gap-8">
          {[
            { icon: FileText, title: 'Cotizaciones PDF', desc: 'Genera cotizaciones profesionales con tu marca, productos y precios. Envíalas por WhatsApp o email.' },
            { icon: MessageSquare, title: 'WhatsApp Integrado', desc: 'Notificaciones automáticas de cotizaciones nuevas, seguimiento y recordatorios por WhatsApp Business.' },
            { icon: BarChart3, title: 'Analytics en Tiempo Real', desc: 'Tracking de cotizaciones vistas, aceptadas y rechazadas. Embudo de ventas completo.' },
            { icon: Globe, title: 'Portal White-Label', desc: 'Cada cliente tiene su portal personalizado con dominio propio, logo y catálogo de productos.' },
          ].map(f => (
            <div key={f.title} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                <f.icon className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 text-center">
        <h2 className="text-2xl font-bold text-slate-900">¿Listo para profesionalizar tus cotizaciones?</h2>
        <Link href="/signup" className="mt-6 inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
          Crear cuenta
        </Link>
      </section>

      <Footer />
    </div>
  );
}
