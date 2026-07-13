import { Nav } from '../shared/components/Nav';
import { Hero } from './components/Hero';
import { AboutSection } from './components/AboutSection';
import { SfeerSection } from './components/SfeerSection';
import { FaqSection } from './components/FaqSection';
import { QuoteWizard } from './components/QuoteWizard/QuoteWizard';
import { Footer } from './components/Footer';

export function App() {
  return (
    <>
      <Nav active="locatie" cta={{ href: '#offerte', label: 'Offerte aanvragen', short: 'Offerte' }} />
      <main>
        <Hero />
        <AboutSection />
        <SfeerSection />
        <FaqSection />
        <QuoteWizard />
      </main>
      <Footer />
    </>
  );
}
