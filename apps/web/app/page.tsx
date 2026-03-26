export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-lg">A</div>
          <span className="text-xl font-bold tracking-tight">Auctorum Systems</span>
        </div>
        <a
          href="/login"
          className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
        >
          Iniciar sesión
        </a>
      </nav>

      {/* Hero */}
      <main className="max-w-7xl mx-auto px-8 pt-20 pb-32">
        <div className="max-w-3xl">
          <div className="inline-block px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-blue-300 text-xs font-medium mb-6">
            Motor de Cotizaciones B2B
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold leading-tight mb-6">
            Cotiza en <span className="text-blue-400">30 segundos</span>,<br />
            no en 2 días
          </h1>
          <p className="text-lg text-slate-300 mb-10 max-w-xl leading-relaxed">
            Portal white-label para proveedores industriales. Tu catálogo, tu marca,
            cotizaciones PDF profesionales con tracking en tiempo real y notificaciones por WhatsApp.
          </p>
          <div className="flex gap-4">
            <a
              href="/dashboard"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors"
            >
              Ver demo →
            </a>
            <a
              href="#features"
              className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-medium transition-colors"
            >
              Características
            </a>
          </div>
        </div>

        {/* Features */}
        <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-32">
          {[
            {
              icon: '⚡',
              title: 'Velocidad competitiva',
              desc: 'El proveedor que cotiza primero gana el 70% de las órdenes. Genera cotizaciones PDF profesionales al instante.',
            },
            {
              icon: '📊',
              title: 'Quote Intelligence',
              desc: 'Sabe cuándo abrieron tu cotización, quién la vio y cuánto tiempo pasó leyéndola. Notificación por WhatsApp en tiempo real.',
            },
            {
              icon: '📇',
              title: 'CRM involuntario',
              desc: 'Cada cotización construye tu base de datos de contactos: empresa, teléfono, productos cotizados, tasa de aceptación.',
            },
            {
              icon: '🌐',
              title: 'Presencia digital',
              desc: 'Tu portal ES tu página web. Tu dominio, tu marca, indexable en Google. Sin costo extra.',
            },
            {
              icon: '🔔',
              title: 'Seguimiento automático',
              desc: 'Recordatorios por WhatsApp a cotizaciones no abiertas. Ninguna cotización se queda sin respuesta.',
            },
            {
              icon: '🏭',
              title: 'Hecho para la industria',
              desc: 'Diseñado para proveedores Tier 2-3 del clúster automotriz: maquinados CNC, empaquetadoras, electromecánica.',
            },
          ].map((f) => (
            <div key={f.title} className="p-6 rounded-xl bg-white/5 border border-white/10 hover:border-blue-500/30 transition-colors">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-sm text-slate-500">
        © 2026 Auctorum Systems · auctorum.com.mx
      </footer>
    </div>
  );
}
