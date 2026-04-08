export const dynamic = 'force-static';

import { Navbar } from '../components/layout/Navbar';
import { LandingExperience } from '../components/landing/LandingExperience';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#050816]">
      <Navbar activePage="home" />
      <LandingExperience />
    </div>
  );
}
