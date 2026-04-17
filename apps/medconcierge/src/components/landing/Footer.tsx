"use client";

import { Phone, MapPin, MessageCircle, Stethoscope } from 'lucide-react';

type Props = {
  doctorName: string
  specialty: string
  address: string
  phone: string
  schedule: Record<string, { enabled: boolean; start: string; end: string }>
  consultationFee: number
  ctaLink: string
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('52')) {
    return `+52 (${digits.slice(2, 5)}) ${digits.slice(5, 8)}-${digits.slice(8)}`
  }
  return phone
}

function formatScheduleLines(schedule: Props['schedule']): { weekdays: string; saturday: string; sunday: string } {
  const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].filter(d => schedule[d]?.enabled)
  const sat = schedule.saturday
  const sun = schedule.sunday

  let weekdayStr = 'Cerrado'
  if (weekdays.length > 0) {
    const t = schedule[weekdays[0]]
    weekdayStr = `Lunes a Viernes: ${t.start} - ${t.end}`
  }

  return {
    weekdays: weekdayStr,
    saturday: sat?.enabled ? `S\u00e1bado: ${sat.start} - ${sat.end}` : 'S\u00e1bado: Cerrado',
    sunday: sun?.enabled ? `Domingo: ${sun.start} - ${sun.end}` : 'Domingo: Cerrado',
  }
}

export default function Footer({ doctorName, specialty, address, phone, schedule, consultationFee, ctaLink }: Props) {
  const displayPhone = formatPhone(phone)
  const telHref = `tel:${phone.replace(/\D/g, '')}`
  const sched = formatScheduleLines(schedule)

  return (
    <footer className="bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid md:grid-cols-3 gap-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-lg bg-teal-600 flex items-center justify-center"><Stethoscope className="w-5 h-5 text-white" /></div>
              <div><p className="font-semibold text-lg">{doctorName}</p><p className="text-sm text-white/50">{specialty}</p></div>
            </div>
          </div>
          <div>
            <p className="font-semibold text-sm uppercase tracking-wider text-white/60 mb-4">Contacto</p>
            <div className="space-y-3">
              {address && (
                <div className="flex items-start gap-2"><MapPin className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" /><p className="text-sm text-white/80">{address}</p></div>
              )}
              {phone && (
                <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-amber-400 flex-shrink-0" /><a href={telHref} className="text-sm text-white/80 hover:text-white transition-colors">{displayPhone}</a></div>
              )}
              <div className="flex items-center gap-2"><MessageCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" /><a href={ctaLink} className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">WhatsApp &mdash; Agendar cita</a></div>
            </div>
          </div>
          <div>
            <p className="font-semibold text-sm uppercase tracking-wider text-white/60 mb-4">Horarios</p>
            <div className="text-sm text-white/70 space-y-1"><p>{sched.weekdays}</p><p>{sched.saturday}</p><p className="text-white/40">{sched.sunday}</p></div>
            {consultationFee > 0 && (
              <div className="mt-4 pt-4 border-t border-white/10"><p className="text-sm text-white/60">Consulta: <span className="text-amber-400 font-semibold">${consultationFee.toLocaleString()} MXN</span></p></div>
            )}
          </div>
        </div>
        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="text-xs text-white/40">&copy; {new Date().getFullYear()} {doctorName} &mdash; {specialty}. Todos los derechos reservados.</p>
          <p className="text-xs text-white/30">Powered by <span className="text-teal-400">AUCTORUM</span> Systems</p>
        </div>
      </div>
    </footer>
  );
}
