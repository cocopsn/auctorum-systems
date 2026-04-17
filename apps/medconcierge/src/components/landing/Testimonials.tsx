'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Star, ShieldCheck, Quote } from 'lucide-react';

const testimonials = [
  { name: 'Ana María Treviño', text: 'Excelente doctora. Me atendió con mucha paciencia y me explicó cada paso del tratamiento para mi acné. Los resultados fueron increíbles en pocas semanas.', rating: 5, date: 'marzo 2026' },
  { name: 'Roberto García Leal', text: 'Muy profesional y actualizada. Me detectó un lunar sospechoso a tiempo y el seguimiento fue impecable. Totalmente recomendada.', rating: 5, date: 'febrero 2026' },
  { name: 'Patricia Montemayor', text: 'Mi experiencia con el tratamiento láser fue maravillosa. La Dra. Martínez es muy cuidadosa y los resultados superaron mis expectativas.', rating: 5, date: 'enero 2026' },
  { name: 'Diana Sánchez Vega', text: 'Llevé a mi hija adolescente por problemas de acné y la doctora fue super atenta. Le dio un tratamiento personalizado y ya se nota la mejora.', rating: 5, date: 'diciembre 2025' },
];

function TestimonialCard({ t, i }: { t: typeof testimonials[0]; i: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const initials = t.name.split(' ').map(w => w[0]).slice(0, 2).join('');
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: i * 0.15, duration: 0.5 }} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg hover:shadow-teal-900/5 border border-gray-100 transition-all duration-300 relative">
      <Quote className="absolute top-4 right-4 w-8 h-8 text-teal-100" />
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-teal-600 to-amber-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{initials}</div>
        <div><p className="font-semibold text-sm text-slate-900">{t.name}</p><p className="text-xs text-slate-400">{t.date}</p></div>
      </div>
      <div className="flex gap-0.5 mb-3">{[...Array(t.rating)].map((_, j) => (<Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />))}</div>
      <p className="text-sm text-slate-600 leading-relaxed mb-4">&ldquo;{t.text}&rdquo;</p>
      <div className="flex items-center gap-1.5 text-teal-600/60"><ShieldCheck className="w-3.5 h-3.5" /><span className="text-xs">Paciente verificado</span></div>
    </motion.div>
  );
}

export default function Testimonials() {
  return (
    <section id="testimonios" className="px-4 sm:px-6 lg:px-8 py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="text-center mb-12">
          <p className="text-xs text-teal-600 uppercase tracking-[0.2em] mb-3 font-semibold">Testimonios</p>
          <h2 className="font-light text-3xl md:text-4xl lg:text-5xl text-slate-900">Lo que dicen <span className="font-semibold text-teal-700">nuestros pacientes</span></h2>
        </motion.div>
        <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {testimonials.map((t, i) => (<TestimonialCard key={t.name} t={t} i={i} />))}
        </div>
      </div>
    </section>
  );
}
