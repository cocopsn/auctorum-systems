'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Star, Shield } from 'lucide-react';
import DoctorSilhouette from './DoctorSilhouette';

type Props = {
  doctorName: string
  specialty: string
  subSpecialty?: string
  tagline?: string
  rating: number
  reviewCount: number
  yearsExperience: number
  consultationFee: number
  ctaLink: string
  initials: string
  portraitUrl?: string
  portraitGender?: 'female' | 'male'
}

export default function Hero({
  doctorName,
  specialty,
  subSpecialty,
  tagline,
  rating,
  reviewCount,
  yearsExperience,
  consultationFee,
  ctaLink,
  initials,
  portraitUrl,
  portraitGender,
}: Props) {
  const specialtyLabel = subSpecialty ? `${specialty} \u2014 ${subSpecialty}` : specialty

  return (
    <section className="relative min-h-[100dvh] flex items-center overflow-hidden bg-gradient-to-br from-teal-800 via-teal-700 to-teal-600">
      <div className="absolute inset-0 opacity-[0.04]">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#F8FAFB] to-transparent z-10" />

      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 w-full">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} className="order-2 lg:order-1">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, duration: 0.5 }} className="inline-flex items-center gap-2 bg-amber-500 text-slate-900 px-4 py-2 rounded-full mb-6 shadow-lg shadow-amber-500/30">
              <Shield className="w-4 h-4" />
              <span className="font-bold text-sm tracking-wide">CERTIFICADA POR CONSEJO MEXICANO</span>
            </motion.div>

            <h1 className="font-light text-4xl sm:text-5xl lg:text-6xl text-white leading-[1.1] mb-4">
              {tagline || (
                <>Tu piel en las mejores{' '}<span className="font-semibold text-amber-400">manos</span></>
              )}
            </h1>

            <p className="font-medium text-lg sm:text-xl text-amber-300 mb-4">{doctorName} &mdash; {specialtyLabel}</p>

            <p className="text-white/80 text-base sm:text-lg leading-relaxed mb-8 max-w-xl">
              {yearsExperience > 0 && <>{yearsExperience} a&ntilde;os de experiencia en {specialty.toLowerCase()}. </>}
              {consultationFee > 0 && <>Consulta: ${consultationFee.toLocaleString()} MXN. </>}
              Agenda f&aacute;cil por WhatsApp.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <a href={ctaLink} className="group inline-flex items-center justify-center gap-3 bg-amber-500 hover:bg-amber-400 text-slate-900 px-8 py-4 rounded-full font-bold text-lg transition-all hover:shadow-xl hover:shadow-amber-500/30 hover:scale-[1.02]">
                Agendar por WhatsApp
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
              <a href="#servicios" className="inline-flex items-center justify-center gap-2 border-2 border-white/30 hover:border-white/60 text-white px-6 py-4 rounded-full font-medium transition-all hover:bg-white/10">Ver servicios</a>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="order-1 lg:order-2 flex justify-center">
            <div className="relative">
              <div className="absolute -inset-4 bg-amber-400/20 rounded-[2rem] blur-3xl" />
              <div className="relative w-72 h-72 sm:w-80 sm:h-80 lg:w-[400px] lg:h-[400px] rounded-[2rem] overflow-hidden border-4 border-amber-400/40 shadow-2xl bg-gradient-to-br from-teal-100 via-teal-200 to-teal-400 flex items-end justify-center">
                {portraitUrl ? (
                  // Real photo (when the doctor has uploaded one)
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={portraitUrl}
                    alt={doctorName}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  // Stylized SVG silhouette — keeps the hero from looking
                  // empty even before the doctor uploads a real photo.
                  // Female default to match Dra. Martínez (seed tenant).
                  <DoctorSilhouette
                    gender={portraitGender ?? 'female'}
                    className="w-[110%] h-[110%] -mb-2"
                  />
                )}
                {/* Initials chip in the corner — doubles as a subtle brand mark */}
                <span className="absolute top-3 right-3 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/90 backdrop-blur-sm text-lg font-semibold text-teal-800 shadow-md">
                  {initials}
                </span>
              </div>
              {reviewCount > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.5 }} className="absolute -bottom-4 -left-4 sm:-bottom-6 sm:-left-6 bg-white/90 backdrop-blur-xl rounded-2xl px-4 py-3 shadow-xl border border-gray-200">
                  <div className="flex items-center gap-2">
                    <div className="flex">{[...Array(5)].map((_, i) => (<Star key={i} className={`w-4 h-4 ${i < Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />))}</div>
                    <div>
                      <p className="font-bold text-sm text-slate-900">{rating}&#9733; Google</p>
                      <p className="text-xs text-slate-500">{reviewCount} rese&ntilde;as</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
