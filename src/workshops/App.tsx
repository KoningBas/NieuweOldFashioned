import { Nav } from './components/Nav';
import { Hero } from './components/Hero';
import { AboutSection } from './components/AboutSection';
import { SfeerSection } from './components/SfeerSection';
import { ArrangementenSection } from './components/ArrangementenSection';
import { FaqSection } from './components/FaqSection';
import { ReserveringSection } from './components/ReserveringSection';
import { Footer } from './components/Footer';

export function App() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <AboutSection />
        <SfeerSection />
        <ArrangementenSection />
        <FaqSection />
        <ReserveringSection />
      </main>
      <Footer />
    </>
  );
}
