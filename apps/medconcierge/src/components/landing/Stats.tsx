'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Calendar, Star, Users, Clock } from 'lucide-react';

type Props = {
  yearsExperience: number
  rating: number
  patientCount: string
  schedule: Record<string, { enabled: boolean; start: string; end: string }>
}

function buildScheduleLabel(schedule: Props['schedule']): string {
  const dayAbbr: Record<string, string> = {
    monday: 'L', tuesday: 'Ma', wednesday: 'Mi',
    thursday: 'J', friday: 'V', saturday: 'S', sunday: 'D',
  }
  const order = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  const enabled = order.filter(d => schedule[d]?.enabled)
  if (enabled.length === 0) return ''

  const firstTime = schedule[enabled[0]]
  const timeStr = `${firstTime.start}-${firstTime.end?.replace(':00', 'h')}`

  if (enabled.length <= 2) {
    return `${enabled.map(d => dayAbbr[d]).join(',')} ${timeStr}`
  }

  return `${dayAbbr[enabled[0]]}-${dayAbbr[enabled[enabled.length - 1]]} ${timeStr}`
}

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

export default function Stats({ yearsExperience, rating, patientCount, schedule }: Props) {
  const scheduleLabel = buildScheduleLabel(schedule)

  // Parse patientCount string like "5,000+" into numeric value
  const patientNum = parseInt(patientCount.replace(/[^0-9]/g, '')) || 0
  const patientSuffix = patientCount.includes('+') ? '+' : ''

  // Hide stats whose underlying value is missing \u2014 pre-2026-05-10 this
  // would render "\u2605" alone or "0+" alone, looking like a half-finished
  // landing. The Schedule slot is special-cased: it has no numeric
  // value, the suffix carries the text, so we keep it whenever the
  // tenant defined a schedule.
  const stats = [
    yearsExperience > 0 && { label: 'A\u00f1os de experiencia', value: yearsExperience, suffix: '', icon: Calendar },
    rating > 0 && { label: 'Google Maps', value: rating, suffix: '\u2605', icon: Star, isDecimal: true },
    patientNum > 0 && { label: 'Pacientes atendidos', value: patientNum, suffix: patientSuffix, icon: Users },
    scheduleLabel && { label: 'Horario', value: 0, suffix: scheduleLabel, icon: Clock },
  ].filter((s): s is { label: string; value: number; suffix: string; icon: typeof Calendar; isDecimal?: boolean } => Boolean(s))

  if (stats.length === 0) return null

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
