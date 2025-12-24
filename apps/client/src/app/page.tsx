import Hero from '../components/ui/Landing/Hero';
import Features from '../components/ui/Landing/Features';
import Pricing from '../components/ui/Landing/Pricing';
import WhySEO from '../components/ui/Landing/WhySEO';
import SEOExplain from '../components/ui/Landing/SEOExplain';
import Testimonials from '../components/ui/Landing/Testimonials';
import FAQ from '../components/ui/Landing/FAQ';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white selection:bg-indigo-500/30 transition-colors duration-300">
      <Hero />
      <WhySEO />
      <SEOExplain />
      <Features />
      <Testimonials />
      <Pricing />
      <FAQ />
    </main>
  );
}