'use client';

import { motion } from 'framer-motion';
import { MapPin, Phone, Clock, MessageCircle } from 'lucide-react';

type Props = {
  address: string
  phone: string
  email: string
  schedule: Record<string, { enabled: boolean; start: string; end: string }>
  consultationFee: number
  ctaLink: string
}

function formatScheduleLines(schedule: Props['schedule']): { weekdays: string; saturday: string; sunday: string } {
  const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  const dayNames: Record<string, string> = {
    monday: 'Lunes', tuesday: 'Martes', wednesday: 'Mi\u00e9rcoles',
    thursday: 'Jueves', friday: 'Viernes', saturday: 'S\u00e1bado', sunday: 'Domingo',
  }

  const weekdays = dayOrder.slice(0, 5).filter(d => schedule[d]?.enabled)
  const sat = schedule.saturday
  const sun = schedule.sunday

  let weekdayStr = 'Cerrado'
  if (weekdays.length > 0) {
    const t = schedule[weekdays[0]]
    weekdayStr = `${t.start} - ${t.end}`
    if (weekdays.length === 5) weekdayStr = `Lunes a Viernes: ${weekdayStr}`
    else weekdayStr = `${weekdays.map(d => dayNames[d]).join(', ')}: ${weekdayStr}`
  }

  return {
    weekdays: weekdayStr,
    saturday: sat?.enabled ? `S\u00e1bado: ${sat.start} - ${sat.end}` : 'S\u00e1bado: Cerrado',
    sunday: sun?.enabled ? `Domingo: ${sun.start} - ${sun.end}` : 'Domingo: Cerrado',
  }
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('52')) {
    return `+52 (${digits.slice(2, 5)}) ${digits.slice(5, 8)}-${digits.slice(8)}`
  }
  return phone
}

export default function MapSection({ address, phone, schedule, consultationFee, ctaLink }: Props) {
  const sched = formatScheduleLines(schedule)
  const displayPhone = formatPhone(phone)
  const telHref = `tel:${phone.replace(/\D/g, '')}`

  // Build a simple Google Maps embed URL from address
  const mapQuery = encodeURIComponent(address)

  return (
    <section id="ubicacion" className="px-4 sm:px-6 lg:px-8 py-16 md:py-24 bg-[#F8FAFB]">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="text-center mb-12">
          <p className="text-xs text-teal-600 uppercase tracking-[0.2em] mb-3 font-semibold">Ubicaci&oacute;n</p>
          <h2 className="font-light text-3xl md:text-4xl lg:text-5xl text-slate-900">Enc&uacute;entranos</h2>
        </motion.div>
        <div className="grid lg:grid-cols-2 gap-8">
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="rounded-2xl overflow-hidden shadow-lg border border-gray-100 h-80 lg:h-full min-h-[320px]">
            {/*
              Maps API key now read from public env (NEXT_PUBLIC_GOOGLE_MAPS_KEY).
              Pre-2026-05-10 the key was hardcoded in this JSX, shipped in
              every visitor's bundle, and could be scraped to abuse the
              quota. The new key is restricted by HTTP referrer in GCP
              (*.auctorum.com.mx) so even if extracted it can't be
              abused from another origin.
              When the env is missing we render the embed without a key \u2014
              Maps falls back to a "for development purposes only" tile,
              which is honest and uglier than a fake.
            */}
            <iframe
              src={`https://www.google.com/maps/embed/v1/place?${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ? `key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}&` : ''}q=${mapQuery}`}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Ubicaci\u00f3n del consultorio"
            />
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center"><MapPin className="w-5 h-5 text-teal-600" /></div>
              <div><p className="font-semibold text-slate-900">Direcci&oacute;n</p><p className="text-sm text-slate-500 mt-1">{address}</p></div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center"><Phone className="w-5 h-5 text-teal-600" /></div>
              <div><p className="font-semibold text-slate-900">Tel&eacute;fono</p><a href={telHref} className="text-sm text-teal-600 hover:text-teal-700 transition-colors mt-1 inline-block">{displayPhone}</a></div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center"><MessageCircle className="w-5 h-5 text-emerald-600" /></div>
              <div><p className="font-semibold text-slate-900">WhatsApp</p><a href={ctaLink} className="text-sm text-emerald-600 hover:text-emerald-700 transition-colors mt-1 inline-block">Enviar mensaje &mdash; Agendar cita</a></div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center"><Clock className="w-5 h-5 text-teal-600" /></div>
              <div><p className="font-semibold text-slate-900">Horario</p><div className="text-sm text-slate-500 mt-1 space-y-0.5"><p>{sched.weekdays}</p><p>{sched.saturday}</p><p className="text-xs text-slate-400">{sched.sunday}</p></div></div>
            </div>
            {consultationFee > 0 && (
              <div className="bg-teal-50 rounded-xl p-4 border border-teal-100">
                <p className="text-sm text-slate-700"><strong className="text-teal-700">Consulta:</strong> ${consultationFee.toLocaleString()} MXN</p>
                <p className="text-xs text-slate-500 mt-1">Aceptamos efectivo, tarjeta y transferencia</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
