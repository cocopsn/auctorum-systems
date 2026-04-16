'use client';

import { motion } from 'framer-motion';
import { MessageCircle, Phone, ArrowRight } from 'lucide-react';

export default function CTA() {
  return (
    <section className="relative overflow-hidden bg-teal-800 py-20 md:py-28">
      <div className="absolute inset-0 opacity-[0.06]"><div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '48px 48px' }} /></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-400/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-teal-400/20 rounded-full blur-[100px]" />
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
          <h2 className="font-light text-3xl sm:text-4xl lg:text-5xl text-white leading-tight mb-6">Agenda tu cita hoy</h2>
          <p className="text-white/70 text-lg mb-10 max-w-2xl mx-auto">15 años de experiencia. Atención personalizada. Consulta: $800 MXN.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="/agendar" className="group inline-flex items-center gap-3 bg-amber-500 hover:bg-amber-400 text-slate-900 px-8 py-4 rounded-full font-bold text-lg transition-all hover:shadow-xl hover:shadow-amber-500/30 hover:scale-[1.02]">
              <MessageCircle className="w-6 h-6" />Agendar por WhatsApp<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
            <a href="tel:+528441234567" className="inline-flex items-center gap-2 border-2 border-white/30 hover:border-white/60 text-white px-6 py-4 rounded-full font-medium transition-all hover:bg-white/10"><Phone className="w-5 h-5" />(844) 123-4567</a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
