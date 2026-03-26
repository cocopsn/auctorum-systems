import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Auctorum Systems — Motor de Cotizaciones B2B',
  description:
    'Plataforma SaaS para proveedores industriales. Cotiza en 30 segundos, PDF profesional, WhatsApp, seguimiento automático.',
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      {/* Nav */}
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center font-bold text-sm">A</div>
          <span className="text-lg font-semibold tracking-tight">Auctorum Systems</span>
        </div>
        <a
          href="https://wa.me/528441234567?text=Quiero%20información%20del%20Motor%20de%20Cotizaciones"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
        >
          Solicitar demo
        </a>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <p className="text-blue-400 text-sm font-medium uppercase tracking-widest mb-4">
          Motor de Cotizaciones B2B
        </p>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-6">
          Cotiza en <span className="text-blue-400">30 segundos</span>,<br />
          cierra más ventas
        </h1>
        <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
          Tu portal de cotizaciones con tu marca. PDF profesional, notificación por WhatsApp,
          seguimiento automático. Sin programar, sin diseñar, listo hoy.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="https://demo.auctorum.com.mx"
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-8 py-3 rounded-lg transition-colors text-center"
          >
            Ver demo en vivo
          </a>
          <a
            href="https://wa.me/528441234567?text=Quiero%20cotizar%20el%20Motor%20B2B"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-slate-600 hover:border-slate-400 text-white font-semibold px-8 py-3 rounded-lg transition-colors text-center"
          >
            Contactar ventas
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            title="Cotización al instante"
            description="Tu cliente selecciona productos, llena sus datos y recibe PDF profesional con tu marca en menos de 30 segundos."
          />
          <FeatureCard
            title="WhatsApp automático"
            description="El cliente recibe su cotización por WhatsApp. Tú recibes la alerta con datos del lead y monto cotizado."
          />
          <FeatureCard
            title="Quote Intelligence"
            description="Sabe cuándo abrieron tu cotización, quién la vio y cuánto tiempo pasó leyéndola. Seguimiento automático a 48hrs."
          />
          <FeatureCard
            title="Tu marca, tu dominio"
            description="Portal 100% con tu identidad: logo, colores, términos comerciales. Es tu página web profesional."
          />
          <FeatureCard
            title="CRM involuntario"
            description="Cada cotización construye tu base de clientes: empresa, contacto, productos cotizados, montos, frecuencia."
          />
          <FeatureCard
            title="Cero curva de aprendizaje"
            description="Sin Excel, sin capacitación. Tu equipo de ventas cotiza desde el celular en minutos."
          />
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <h2 className="text-3xl font-bold mb-4">Listo para la región automotriz</h2>
        <p className="text-slate-300 mb-8 leading-relaxed">
          Diseñado para proveedores industriales del clúster Saltillo–Ramos Arizpe.
          Maquinados CNC, empaquetadoras, electromecánica, tarimeras y más.
        </p>
        <a
          href="https://wa.me/528441234567?text=Quiero%20información%20del%20Motor%20de%20Cotizaciones"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
        >
          Agendar demostración
        </a>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700 mt-8">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between text-sm text-slate-400 gap-4">
          <p>Auctorum Systems &mdash; Plataforma de IA Personal Soberana</p>
          <p>Saltillo, Coahuila, México</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-slate-500 transition-colors">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}
