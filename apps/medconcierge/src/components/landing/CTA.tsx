'use client';

import { motion } from 'framer-motion';
import { MessageCircle, Phone, ArrowRight } from 'lucide-react';

type Props = {
  doctorName: string
  yearsExperience: number
  consultationFee: number
  ctaLink: string
  phone: string
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('52')) {
    return `(${digits.slice(2, 5)}) ${digits.slice(5, 8)}-${digits.slice(8)}`
  }
  return phone
}

export default function CTA({ yearsExperience, consultationFee, ctaLink, phone }: Props) {
  const displayPhone = formatPhone(phone)
  const telHref = `tel:${phone.replace(/\D/g, '')}`

  const subtextParts: string[] = []
  if (yearsExperience > 0) subtextParts.push(`${yearsExperience} a\u00f1os de experiencia`)
  subtextParts.push('Atenci\u00f3n personalizada')
  if (consultationFee > 0) subtextParts.push(`Consulta: $${consultationFee.toLocaleString()} MXN`)

  return (
    <section className="relative overflow-hidden bg-teal-800 py-20 md:py-28">
      <div className="absolute inset-0 opacity-[0.06]"><div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '48px 48px' }} /></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-400/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-teal-400/20 rounded-full blur-[100px]" />
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
          <h2 className="font-light text-3xl sm:text-4xl lg:text-5xl text-white leading-tight mb-6">Agenda tu cita hoy</h2>
          <p className="text-white/70 text-lg mb-10 max-w-2xl mx-auto">{subtextParts.join('. ')}.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href={ctaLink} className="group inline-flex items-center gap-3 bg-amber-500 hover:bg-amber-400 text-slate-900 px-8 py-4 rounded-full font-bold text-lg transition-all hover:shadow-xl hover:shadow-amber-500/30 hover:scale-[1.02]">
              <MessageCircle className="w-6 h-6" />Agendar por WhatsApp<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
            {phone && (
              <a href={telHref} className="inline-flex items-center gap-2 border-2 border-white/30 hover:border-white/60 text-white px-6 py-4 rounded-full font-medium transition-all hover:bg-white/10"><Phone className="w-5 h-5" />{displayPhone}</a>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
