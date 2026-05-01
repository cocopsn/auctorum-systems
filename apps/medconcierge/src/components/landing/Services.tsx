'use client';

import { motion } from 'framer-motion';
import { Sun, Shield, Sparkles, Search, Zap, Heart, Star, Activity, Stethoscope, Eye, Pill, Brain } from 'lucide-react';
import type { LandingService } from '@/lib/landing-data';

const ICON_MAP: Record<string, any> = {
  Shield, Sparkles, Sun, Search, Zap, Heart, Star, Activity, Stethoscope, Eye, Pill, Brain,
}

type Props = {
  services: LandingService[]
}

export default function Services({ services }: Props) {
  return (
    <section id="servicios" className="px-4 sm:px-6 lg:px-8 py-16 md:py-24 bg-[#F8FAFB]">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="text-center mb-12">
          <p className="text-xs text-teal-600 uppercase tracking-[0.2em] mb-3 font-semibold">Especialidades</p>
          <h2 className="font-light text-3xl md:text-4xl lg:text-5xl text-slate-900">Nuestros <span className="font-semibold text-teal-700">Servicios</span></h2>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((s, i) => {
            const Icon = ICON_MAP[s.icon] || Shield
            return (
              <motion.div key={s.name} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }} className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-teal-900/10 border border-gray-100 hover:border-teal-200 transition-all duration-300 hover:-translate-y-1 p-6">
                <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center mb-4 group-hover:bg-teal-100 transition-colors"><Icon className="w-6 h-6 text-teal-600" /></div>
                <h3 className="font-semibold text-lg text-slate-900 mb-2">{s.name}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{s.description}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  );
}
