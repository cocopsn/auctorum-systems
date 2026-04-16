'use client';

import { motion } from 'framer-motion';
import { MapPin, Phone, Clock, MessageCircle } from 'lucide-react';

export default function MapSection() {
  return (
    <section id="ubicacion" className="px-4 sm:px-6 lg:px-8 py-16 md:py-24 bg-[#F8FAFB]">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="text-center mb-12">
          <p className="text-xs text-teal-600 uppercase tracking-[0.2em] mb-3 font-semibold">Ubicación</p>
          <h2 className="font-light text-3xl md:text-4xl lg:text-5xl text-slate-900">Encuéntranos en <span className="font-semibold text-teal-700">Saltillo</span></h2>
        </motion.div>
        <div className="grid lg:grid-cols-2 gap-8">
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="rounded-2xl overflow-hidden shadow-lg border border-gray-100 h-80 lg:h-full min-h-[320px]">
            <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3602.8!2d-100.99!3d25.42!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sBlvd.+V.+Carranza+2345%2C+Saltillo!5e0!3m2!1ses!2smx!4v1" width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Consultorio Dra. Laura Martínez" />
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center"><MapPin className="w-5 h-5 text-teal-600" /></div>
              <div><p className="font-semibold text-slate-900">Dirección</p><p className="text-sm text-slate-500 mt-1">Blvd. V. Carranza 2345, Consultorio 8,<br />Saltillo, Coahuila</p></div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center"><Phone className="w-5 h-5 text-teal-600" /></div>
              <div><p className="font-semibold text-slate-900">Teléfono</p><a href="tel:+528441234567" className="text-sm text-teal-600 hover:text-teal-700 transition-colors mt-1 inline-block">+52 (844) 123-4567</a></div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center"><MessageCircle className="w-5 h-5 text-emerald-600" /></div>
              <div><p className="font-semibold text-slate-900">WhatsApp</p><a href="/agendar" className="text-sm text-emerald-600 hover:text-emerald-700 transition-colors mt-1 inline-block">Enviar mensaje — Agendar cita</a></div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center"><Clock className="w-5 h-5 text-teal-600" /></div>
              <div><p className="font-semibold text-slate-900">Horario</p><div className="text-sm text-slate-500 mt-1 space-y-0.5"><p>Lunes a Viernes: 9:00 - 14:00</p><p>Sábado: 10:00 - 13:00</p><p className="text-xs text-slate-400">Domingo: Cerrado</p></div></div>
            </div>
            <div className="bg-teal-50 rounded-xl p-4 border border-teal-100">
              <p className="text-sm text-slate-700"><strong className="text-teal-700">Consulta:</strong> $800 MXN</p>
              <p className="text-xs text-slate-500 mt-1">Aceptamos efectivo, tarjeta y transferencia</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
