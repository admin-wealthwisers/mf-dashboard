import { useAuth } from '../lib/AuthContext';
import Navbar from '../components/landing/Navbar';
import Hero from '../components/landing/Hero';
import TrustBar from '../components/landing/TrustBar';
import Features from '../components/landing/Features';
import HowItWorks from '../components/landing/HowItWorks';
import Pricing from '../components/landing/Pricing';
import FAQ from '../components/landing/FAQ';
import FinalCTA from '../components/landing/FinalCTA';
import Footer from '../components/landing/Footer';

export default function LandingPage() {
  const { login } = useAuth();

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
      <Navbar login={login} />
      <Hero login={login} />
      <TrustBar />
      <Features />
      <HowItWorks />
      <Pricing login={login} />
      <FAQ />
      <FinalCTA login={login} />
      <Footer />
    </div>
  );
}
