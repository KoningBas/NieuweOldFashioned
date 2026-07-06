import { useEffect, useState } from 'react';
import { fetchFeaturedPackages } from '../../shared/lib/data';
import type { ServicePackage } from '../../shared/types/db';

const PACKAGE_IMAGES: Record<string, string> = {
  bartending: '/OldImages/HighCocktail.jpg',
  workshop: '/OldImages/Workshop.png',
};

function formatPriceUnit(pkg: ServicePackage): string {
  return pkg.price_unit === 'per_cocktail' ? 'per cocktail' : 'per persoon';
}

export function PackagesSection() {
  const [packages, setPackages] = useState<ServicePackage[]>([]);

  useEffect(() => {
    fetchFeaturedPackages().then(setPackages).catch(() => setPackages([]));
  }, []);

  if (packages.length === 0) return null;

  return (
    <section id="pakketten" className="py-28 px-6 md:px-10">
      <div className="max-w-7xl mx-auto">
        <p className="uppercase tracking-[0.3em] text-gold-light text-sm mb-4">Onze diensten</p>
        <h2 className="font-heading text-4xl md:text-5xl tracking-[-0.02em] mb-16 max-w-xl">Bartending en workshops, bij jou op locatie</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="group relative rounded-2xl overflow-hidden bg-surface-elevated border border-white/5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)] hover:shadow-[0_25px_60px_-15px_rgba(200,146,42,0.25)] transition-transform duration-300 hover:-translate-y-1"
            >
              <div className="relative h-64 overflow-hidden">
                <img
                  src={PACKAGE_IMAGES[pkg.category] ?? '/OldImages/HighCocktail.jpg'}
                  alt={pkg.package_name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  style={{ mixBlendMode: 'multiply' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-surface-elevated via-surface-elevated/20 to-transparent" />
              </div>
              <div className="p-8">
                <h3 className="font-heading text-2xl mb-3">{pkg.package_name}</h3>
                <p className="text-muted leading-[1.7] mb-6">{pkg.description}</p>
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-gold-light text-2xl font-heading">&euro;{pkg.price}</span>
                    <span className="text-muted text-sm ml-1">{formatPriceUnit(pkg)}</span>
                  </div>
                  <a href="#offerte" className="text-sm text-gold-light hover:text-white transition-colors">Offerte aanvragen &rarr;</a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
