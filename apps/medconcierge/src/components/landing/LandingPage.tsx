'use client'

import type { TenantLandingData } from '@/lib/landing-data'
import Navbar from '@/components/landing/Navbar'
import Hero from '@/components/landing/Hero'
import Stats from '@/components/landing/Stats'
import Services from '@/components/landing/Services'
import Testimonials from '@/components/landing/Testimonials'
import MapSection from '@/components/landing/MapSection'
import CTA from '@/components/landing/CTA'
import Footer from '@/components/landing/Footer'
import WhatsAppButton from '@/components/landing/WhatsAppButton'

type Props = {
  data: TenantLandingData
}

export default function LandingPage({ data }: Props) {
  return (
    <>
      <Navbar doctorName={data.doctorName} specialty={data.specialty} ctaLink={data.ctaLink} />
      <main>
        <Hero
          doctorName={data.doctorName}
          specialty={data.specialty}
          subSpecialty={data.subSpecialty}
          tagline={data.tagline}
          rating={data.rating}
          reviewCount={data.reviewCount}
          yearsExperience={data.yearsExperience}
          consultationFee={data.consultationFee}
          ctaLink={data.ctaLink}
          initials={data.initials}
          portraitUrl={data.portraitUrl}
          portraitGender={data.portraitGender}
        />
        <Stats
          yearsExperience={data.yearsExperience}
          rating={data.rating}
          patientCount={data.patientCount}
          schedule={data.schedule}
        />
        {data.services.length > 0 && <Services services={data.services} />}
        {data.testimonials.length > 0 && <Testimonials testimonials={data.testimonials} />}
        <MapSection
          address={data.address}
          phone={data.phone}
          email={data.email}
          schedule={data.schedule}
          consultationFee={data.consultationFee}
          ctaLink={data.ctaLink}
        />
        <CTA
          doctorName={data.doctorName}
          yearsExperience={data.yearsExperience}
          consultationFee={data.consultationFee}
          ctaLink={data.ctaLink}
          phone={data.phone}
        />
      </main>
      <Footer
        doctorName={data.doctorName}
        specialty={data.specialty}
        address={data.address}
        phone={data.phone}
        schedule={data.schedule}
        consultationFee={data.consultationFee}
        ctaLink={data.ctaLink}
      />
      <WhatsAppButton whatsappLink={data.whatsappLink} />
    </>
  )
}
