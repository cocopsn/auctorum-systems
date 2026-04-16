'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Calendar, Star, Users, Clock } from 'lucide-react';

const stats = [
  { label: 'Años de experiencia', value: 15, suffix: '', icon: Calendar },
  { label: 'Google Maps', value: 4.8, suffix: '\u2605', icon: Star, isDecimal: true },
  { label: 'Pacientes atendidos', value: 5000, suffix: '+', icon: Users },
  { label: 'Horario', value: 0, suffix: 'L-V 9-14h', icon: Clock },
];

function AnimatedNumber({ value, suffix, isDecimal }: { value: number; suffix: string; isDecimal?: boolean }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView || value === 0) return;
    const dur = 1500, steps = 40, inc = value / steps;
    let cur = 0;
    const iv = setInterval(() => {
      cur += inc;
      if (cur >= value) { setCount(value); clearInterval(iv); }
      else { setCount(isDecimal ? Math.round(cur * 10) / 10 : Math.floor(cur)); }
    }, dur / steps);
    return () => clearInterval(iv);
  }, [inView, value, isDecimal]);

  return (<span ref={ref} className="font-bold text-4xl md:text-5xl">{value === 0 ? suffix : `${isDecimal ? count.toFixed(1) : count.toLocaleString()}${suffix}`}</span>);
}

export default function Stats() {
  return (
    <section className="relative -mt-12 z-30 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl shadow-teal-900/5 border border-gray-100 p-6 md:p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {stats.map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }} className="text-center">
                <stat.icon className="w-6 h-6 mx-auto mb-2 text-teal-600" />
                <div className="text-teal-800"><AnimatedNumber value={stat.value} suffix={stat.suffix} isDecimal={stat.isDecimal} /></div>
                <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
