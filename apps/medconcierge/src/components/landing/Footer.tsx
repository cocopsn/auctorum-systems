import { Phone, MapPin, MessageCircle, Stethoscope } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid md:grid-cols-3 gap-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-lg bg-teal-600 flex items-center justify-center"><Stethoscope className="w-5 h-5 text-white" /></div>
              <div><p className="font-semibold text-lg">Dra. Laura Martínez</p><p className="text-sm text-white/50">Dermatología Especializada</p></div>
            </div>
            <p className="text-sm text-white/60 mt-2">Certificada por el Consejo Mexicano de Dermatología</p>
            <p className="text-xs text-white/40 mt-1">Universidad Autónoma de Nuevo León (UANL)</p>
            <p className="text-xs text-white/40">15 años de experiencia</p>
          </div>
          <div>
            <p className="font-semibold text-sm uppercase tracking-wider text-white/60 mb-4">Contacto</p>
            <div className="space-y-3">
              <div className="flex items-start gap-2"><MapPin className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" /><p className="text-sm text-white/80">Blvd. V. Carranza 2345, Consultorio 8,<br />Saltillo, Coahuila</p></div>
              <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-amber-400 flex-shrink-0" /><a href="tel:+528441234567" className="text-sm text-white/80 hover:text-white transition-colors">+52 (844) 123-4567</a></div>
              <div className="flex items-center gap-2"><MessageCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" /><a href="/agendar" className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">WhatsApp — Agendar cita</a></div>
            </div>
          </div>
          <div>
            <p className="font-semibold text-sm uppercase tracking-wider text-white/60 mb-4">Horarios</p>
            <div className="text-sm text-white/70 space-y-1"><p>Lunes a Viernes: 9:00 - 14:00</p><p>Sábado: 10:00 - 13:00</p><p className="text-white/40">Domingo: Cerrado</p></div>
            <div className="mt-4 pt-4 border-t border-white/10"><p className="text-sm text-white/60">Consulta: <span className="text-amber-400 font-semibold">$800 MXN</span></p></div>
          </div>
        </div>
        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="text-xs text-white/40">&copy; {new Date().getFullYear()} Dra. Laura Martínez — Dermatología. Todos los derechos reservados.</p>
          <p className="text-xs text-white/30">Powered by <span className="text-teal-400">AUCTORUM</span> Systems</p>
        </div>
      </div>
    </footer>
  );
}
