import { useNavigate } from 'react-router-dom';
import { useLenis } from '../hooks/useLenis';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import Navigation from '../components/landing/sections/Navigation';
import Hero from '../components/landing/sections/Hero';
import Features from '../components/landing/sections/Features';
import Pipeline from '../components/landing/sections/Pipeline';
import Fallback from '../components/landing/sections/Fallback';
import Architecture from '../components/landing/sections/Architecture';
import UseCases from '../components/landing/sections/UseCases';
import CTA from '../components/landing/sections/CTA';
import Footer from '../components/landing/sections/Footer';
import '../components/landing/landing.css';

export default function LandingPage() {
  useLenis();
  useScrollAnimation();
  const navigate = useNavigate();
  const goToRegister = () => navigate('/register');
  const goToLogin = () => navigate('/login');

  return (
    <div className="kimi-landing">
      <Navigation onGetStarted={goToRegister} onLogin={goToLogin} />
      <Hero />
      <Features />
      <Pipeline />
      <Fallback />
      <Architecture />
      <UseCases />
      <CTA onGetStarted={goToRegister} onLogin={goToLogin} />
      <Footer />
    </div>
  );
}
