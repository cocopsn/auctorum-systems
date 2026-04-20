export const dynamic = 'force-static';

import Image from 'next/image';
import Link from 'next/link';
import {
  Phone,
  Calendar,
  Receipt,
  MessageSquare,
  Clock,
  Users,
  FileText,
  Shield,
  Heart,
  Stethoscope,
  Star,
  ArrowRight,
  Check,
  Zap,
  Building2,
  Brain,
} from 'lucide-react';

/* =====================================================================
   AUCTORUM SYSTEMS - Concierge Medico Landing Page
   CureNast-style medical SaaS landing - Server Component (no state)
   ===================================================================== */

export default function SystemsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ---- 1. NAVIGATION BAR ---- */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <img
                src="/logo.png"
                alt="Auctorum"
                className="h-8 w-auto"
              />
              <span className="font-semibold text-slate-900 text-lg">
                Auctorum
              </span>
            </Link>

            {/* Center links */}
            <div className="hidden md:flex items-center gap-8">
              <Link
                href="/systems"
                className="text-sm font-medium text-blue-600"
              >
                Concierge Médico
              </Link>
              <Link
                href="/platform"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Cotizador B2B
              </Link>
              <Link
                href="#precios"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Precios
              </Link>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors hidden sm:inline-block"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/signup"
                className="bg-blue-600 text-white rounded-full px-5 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Comenzar $1,400 MXN/mes
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ---- 2. HERO SECTION ---- */}
      <section className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-6xl font-bold text-white max-w-4xl leading-tight">
            Gestión Inteligente para tu Consultorio Médico
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl mt-6 leading-relaxed">
            Automatiza citas, WhatsApp, facturación y más. Tu asistente AI
            atiende pacientes 24/7.
          </p>

          <div className="flex flex-wrap gap-4 mt-10">
            <Link
              href="/signup"
              className="bg-white text-blue-800 hover:bg-blue-50 rounded-full px-8 py-4 font-bold text-lg inline-flex items-center gap-2 transition-colors"
            >
              Comenzar $1,400 MXN/mes
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="#demo"
              className="border-2 border-white/30 text-white hover:bg-white/10 rounded-full px-8 py-4 font-bold text-lg inline-flex items-center gap-2 transition-colors"
            >
              Ver Demo
            </Link>
          </div>

          {/* Stats bar */}
          <div className="flex flex-wrap gap-8 mt-12 text-blue-100">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-300" />
              <span className="text-sm font-medium">500+ Citas Gestionadas</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-200" />
              <span className="text-sm font-medium">24/7 Disponibilidad</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-300" />
              <span className="text-sm font-medium">30min Ahorrados por Paciente</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---- 3. PROBLEM / SOLUTION ---- */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-slate-900 text-center">
            ¿Tu consultorio sigue operando manualmente?
          </h2>

          <div className="grid md:grid-cols-3 gap-8 mt-12">
            {/* Card 1 */}
            <div className="text-center">
              <div className="bg-blue-50 text-blue-600 w-14 h-14 rounded-xl mx-auto flex items-center justify-center">
                <Phone className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mt-5">
                Llamadas perdidas
              </h3>
              <p className="text-slate-500 mt-2 leading-relaxed">
                Pacientes que no logran comunicarse terminan buscando otro
                doctor.
              </p>
            </div>

            {/* Card 2 */}
            <div className="text-center">
              <div className="bg-blue-50 text-blue-600 w-14 h-14 rounded-xl mx-auto flex items-center justify-center">
                <Calendar className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mt-5">
                Citas olvidadas
              </h3>
              <p className="text-slate-500 mt-2 leading-relaxed">
                Sin recordatorios automáticos, las inasistencias cuestan tiempo
                y dinero.
              </p>
            </div>

            {/* Card 3 */}
            <div className="text-center">
              <div className="bg-blue-50 text-blue-600 w-14 h-14 rounded-xl mx-auto flex items-center justify-center">
                <Receipt className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mt-5">
                Facturación manual
              </h3>
              <p className="text-slate-500 mt-2 leading-relaxed">
                Horas dedicadas a generar facturas que podrían automatizarse.
              </p>
            </div>
          </div>

          <p className="text-lg text-blue-600 font-semibold text-center mt-10">
            Con Auctorum, todo esto se automatiza.
          </p>
        </div>
      </section>

      {/* ---- 4. FEATURES (6 cards) ---- */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-slate-900">
            Todo lo que tu consultorio necesita
          </h2>
          <p className="text-slate-500 text-center mt-3 text-lg">
            Una plataforma completa para gestionar tu práctica médica
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12 max-w-6xl mx-auto">
            {/* Feature 1 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                WhatsApp AI 24/7
              </h3>
              <p className="text-slate-500 mt-2 leading-relaxed text-sm">
                Bot inteligente que responde preguntas, agenda citas y envía
                recordatorios automáticos a tus pacientes.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                Agenda Inteligente
              </h3>
              <p className="text-slate-500 mt-2 leading-relaxed text-sm">
                Calendario con horarios configurables, confirmación automática y
                sincronización en tiempo real.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                Portal del Paciente
              </h3>
              <p className="text-slate-500 mt-2 leading-relaxed text-sm">
                Cada doctor con su página personalizada donde los pacientes
                agendan directamente.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                Historial Clínico
              </h3>
              <p className="text-slate-500 mt-2 leading-relaxed text-sm">
                Notas médicas, archivos adjuntos y seguimiento completo de
                tratamientos.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <Receipt className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                Facturación Electrónica
              </h3>
              <p className="text-slate-500 mt-2 leading-relaxed text-sm">
                Genera CFDI automáticamente. Integración con SAT, RFC y
                complementos de pago.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                Campañas y Recordatorios
              </h3>
              <p className="text-slate-500 mt-2 leading-relaxed text-sm">
                Mensajes masivos por WhatsApp para recordatorios, promociones y
                seguimiento.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- 5. HOW IT WORKS ---- */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-slate-900">
            Actívalo en 3 pasos
          </h2>

          <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-0 mt-16">
            {/* Step 1 */}
            <div className="flex-1 text-center">
              <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto">
                1
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mt-4">
                Configura tu perfil
              </h3>
              <p className="text-slate-500 mt-2 text-sm leading-relaxed max-w-xs mx-auto">
                Sube tu logo, horarios y especialidad en 5 minutos
              </p>
            </div>

            {/* Connector line */}
            <div className="hidden md:flex items-center self-center mt-[-1rem]">
              <div className="h-0.5 bg-blue-200 w-20" />
            </div>

            {/* Step 2 */}
            <div className="flex-1 text-center">
              <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto">
                2
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mt-4">
                Comparte tu portal
              </h3>
              <p className="text-slate-500 mt-2 text-sm leading-relaxed max-w-xs mx-auto">
                Tus pacientes agendan desde tu página personalizada
              </p>
            </div>

            {/* Connector line */}
            <div className="hidden md:flex items-center self-center mt-[-1rem]">
              <div className="h-0.5 bg-blue-200 w-20" />
            </div>

            {/* Step 3 */}
            <div className="flex-1 text-center">
              <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto">
                3
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mt-4">
                Gestiona todo
              </h3>
              <p className="text-slate-500 mt-2 text-sm leading-relaxed max-w-xs mx-auto">
                Dashboard completo con citas, pagos y facturación
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- 6. SPECIALTIES ---- */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-center text-slate-900">
            Diseñado para doctores en Saltillo y todo México
          </h2>

          <div className="flex flex-wrap justify-center gap-4 mt-12">
            <span className="bg-white rounded-full px-6 py-3 border border-slate-200 text-slate-700 font-medium shadow-sm">
              Dermatología
            </span>
            <span className="bg-white rounded-full px-6 py-3 border border-slate-200 text-slate-700 font-medium shadow-sm">
              Pediatría
            </span>
            <span className="bg-white rounded-full px-6 py-3 border border-slate-200 text-slate-700 font-medium shadow-sm">
              Traumatología
            </span>
            <span className="bg-white rounded-full px-6 py-3 border border-slate-200 text-slate-700 font-medium shadow-sm">
              Radiología
            </span>
            <span className="bg-white rounded-full px-6 py-3 border border-slate-200 text-slate-700 font-medium shadow-sm">
              Medicina General
            </span>
          </div>
        </div>
      </section>

      {/* ---- 7. PRICING ---- */}
      <section id="precios" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-slate-900">
            Planes simples, sin sorpresas
          </h2>

          <div className="grid md:grid-cols-3 gap-8 mt-12 max-w-5xl mx-auto">
            {/* Plan Básico */}
            <div className="bg-white rounded-2xl p-8 border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Básico</h3>
              <div className="mt-4">
                <span className="text-4xl font-bold text-slate-900">$1,400</span>
                <span className="text-slate-500 ml-1">/mes</span>
              </div>
              <ul className="mt-6 space-y-3">
                <li className="flex items-center gap-2 text-sm text-slate-600">
                  <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  100 conversaciones
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600">
                  <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  1 usuario
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600">
                  <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  Portal básico
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600">
                  <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  Agenda online
                </li>
              </ul>
              <Link
                href="/signup"
                className="mt-8 block text-center border-2 border-blue-600 text-blue-600 rounded-full px-6 py-3 text-sm font-semibold hover:bg-blue-50 transition-colors"
              >
                Comenzar $1,400 MXN/mes
              </Link>
            </div>

            {/* Pro Plan - highlighted */}
            <div className="relative bg-white rounded-2xl p-8 border-2 border-blue-600 shadow-lg">
              <span className="absolute bg-blue-600 text-white text-xs px-3 py-1 rounded-full -top-3 left-1/2 -translate-x-1/2 font-medium">
                Más popular
              </span>
              <h3 className="text-lg font-semibold text-slate-900">Pro</h3>
              <div className="mt-4">
                <span className="text-4xl font-bold text-slate-900">$1,800</span>
                <span className="text-slate-500 ml-1">/mes</span>
              </div>
              <ul className="mt-6 space-y-3">
                <li className="flex items-center gap-2 text-sm text-slate-600">
                  <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  1,000 conversaciones
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600">
                  <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  5 usuarios
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600">
                  <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  WhatsApp AI
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600">
                  <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  Facturación CFDI
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600">
                  <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  Campañas
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600">
                  <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  Soporte prioritario
                </li>
              </ul>
              <Link
                href="/signup?plan=pro"
                className="mt-8 block text-center bg-blue-600 text-white rounded-full px-6 py-3 text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                Elegir Pro
              </Link>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white rounded-2xl p-8 border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Enterprise</h3>
              <div className="mt-4">
                <span className="text-4xl font-bold text-slate-900">Contactar</span>
              </div>
              <ul className="mt-6 space-y-3">
                <li className="flex items-center gap-2 text-sm text-slate-600">
                  <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  Conversaciones ilimitadas
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600">
                  <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  Usuarios ilimitados
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600">
                  <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  Soporte dedicado
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600">
                  <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  Customización completa
                </li>
              </ul>
              <Link
                href="/contact"
                className="mt-8 block text-center border-2 border-blue-600 text-blue-600 rounded-full px-6 py-3 text-sm font-semibold hover:bg-blue-50 transition-colors"
              >
                Contactar
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---- 8. FINAL CTA ---- */}
      <section className="py-20 bg-blue-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white">
            ¿Listo para modernizar tu consultorio?
          </h2>
          <p className="text-blue-100 mt-4 text-lg">
            Comienza hoy hoy. .
          </p>
          <div className="mt-8">
            <Link
              href="/signup"
              className="bg-white text-blue-800 rounded-full px-8 py-4 font-bold text-lg inline-flex items-center gap-2 hover:bg-blue-50 transition-colors"
            >
              Crear mi cuenta $1,400 MXN/mes
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ---- 9. FOOTER ---- */}
      <footer className="bg-slate-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {/* Producto */}
            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider">
                Producto
              </h4>
              <ul className="mt-4 space-y-2">
                <li>
                  <Link href="/systems" className="text-sm text-slate-400 hover:text-white transition-colors">
                    Concierge Médico
                  </Link>
                </li>
                <li>
                  <Link href="/platform" className="text-sm text-slate-400 hover:text-white transition-colors">
                    Cotizador B2B
                  </Link>
                </li>
                <li>
                  <Link href="#precios" className="text-sm text-slate-400 hover:text-white transition-colors">
                    Precios
                  </Link>
                </li>
                <li>
                  <Link href="#demo" className="text-sm text-slate-400 hover:text-white transition-colors">
                    Demo
                  </Link>
                </li>
              </ul>
            </div>

            {/* Empresa */}
            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider">
                Empresa
              </h4>
              <ul className="mt-4 space-y-2">
                <li>
                  <Link href="/about" className="text-sm text-slate-400 hover:text-white transition-colors">
                    Sobre nosotros
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="text-sm text-slate-400 hover:text-white transition-colors">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="/careers" className="text-sm text-slate-400 hover:text-white transition-colors">
                    Carreras
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider">
                Legal
              </h4>
              <ul className="mt-4 space-y-2">
                <li>
                  <Link href="/privacy" className="text-sm text-slate-400 hover:text-white transition-colors">
                    Aviso de Privacidad
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-sm text-slate-400 hover:text-white transition-colors">
                    Términos de Servicio
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contacto */}
            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider">
                Contacto
              </h4>
              <ul className="mt-4 space-y-2">
                <li>
                  <a href="mailto:sistema@auctorum.com.mx" className="text-sm text-slate-400 hover:text-white transition-colors">
                    sistema@auctorum.com.mx
                  </a>
                </li>
                <li className="text-sm text-slate-400">
                  Saltillo, Coahuila, México
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img
                src="/logo.png"
                alt="Auctorum"
                className="h-6 w-auto opacity-70"
              />
              <span className="text-sm text-slate-400">
                © 2026 Auctorum Systems. Todos los derechos reservados.
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
