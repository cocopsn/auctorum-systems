export const dynamic = 'force-static';

import Image from 'next/image';
import Link from 'next/link';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { Heart, FileText, ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar activePage="home" />

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 py-20 md:py-28 px-6">
        <div className="mx-auto max-w-5xl text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight">
            Software de gestión inteligente para profesionales
          </h1>
          <p className="mt-6 text-xl text-blue-100 max-w-2xl mx-auto">
            Plataformas verticales con inteligencia artificial para industrias específicas
          </p>
        </div>
      </section>

      {/* Two Product Cards */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-12">
            Nuestras soluciones
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Concierge Médico - HIGHLIGHTED */}
            <Link href="/systems" className="group relative bg-white rounded-2xl border-2 border-blue-600 p-8 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="absolute -top-3 left-6 bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                Producto principal
              </div>
              <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center mb-6">
                <Heart className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">Concierge Médico AI</h3>
              <p className="mt-2 text-sm text-blue-600 font-medium">Para doctores y consultorios</p>
              <p className="mt-4 text-slate-600 leading-relaxed">
                Automatiza citas, WhatsApp, facturación y expedientes. Tu asistente AI atiende pacientes 24/7.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {['WhatsApp AI', 'Agenda', 'Facturación', 'Portal pacientes'].map(tag => (
                  <span key={tag} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">{tag}</span>
                ))}
              </div>
              <div className="mt-6 inline-flex items-center gap-2 text-blue-600 font-semibold text-sm group-hover:gap-3 transition-all">
                Conocer más <ArrowRight className="w-4 h-4" />
              </div>
            </Link>

            {/* Motor de Cotizaciones B2B - Secondary */}
            <Link href="/platform" className="group bg-white rounded-2xl border border-slate-200 p-8 shadow-sm hover:shadow-lg transition-all duration-300">
              <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mb-6">
                <FileText className="w-7 h-7 text-slate-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">Motor de Cotizaciones B2B</h3>
              <p className="mt-2 text-sm text-slate-500 font-medium">Para negocios e industria</p>
              <p className="mt-4 text-slate-600 leading-relaxed">
                Portales white-label para proveedores industriales. Catálogo, cotizaciones PDF, tracking y WhatsApp.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {['Multi-tenant', 'WhatsApp', 'PDF', 'Catálogo'].map(tag => (
                  <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">{tag}</span>
                ))}
              </div>
              <div className="mt-6 inline-flex items-center gap-2 text-slate-600 font-semibold text-sm group-hover:gap-3 transition-all">
                Ver más <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
