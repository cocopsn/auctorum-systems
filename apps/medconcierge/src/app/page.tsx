import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import Stats from '@/components/landing/Stats';
import Services from '@/components/landing/Services';
import Testimonials from '@/components/landing/Testimonials';
import MapSection from '@/components/landing/MapSection';
import CTA from '@/components/landing/CTA';
import Footer from '@/components/landing/Footer';
import WhatsAppButton from '@/components/landing/WhatsAppButton';

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Stats />
        <Services />
        <Testimonials />
        <MapSection />
        <CTA />
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
