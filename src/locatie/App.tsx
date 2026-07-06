import { Nav } from './components/Nav';
import { Hero } from './components/Hero';
import { PackagesSection } from './components/PackagesSection';
import { CocktailsSection } from './components/CocktailsSection';
import { AboutSection } from './components/AboutSection';
import { QuoteWizard } from './components/QuoteWizard/QuoteWizard';
import { Footer } from './components/Footer';

export function App() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <PackagesSection />
        <CocktailsSection />
        <AboutSection />
        <QuoteWizard />
      </main>
      <Footer />
    </>
  );
}
