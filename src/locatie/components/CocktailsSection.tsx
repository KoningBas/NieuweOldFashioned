import { useEffect, useState } from 'react';
import { fetchFeaturedCocktails } from '../../shared/lib/data';
import type { CocktailMenuItem } from '../../shared/types/db';

export function CocktailsSection() {
  const [cocktails, setCocktails] = useState<CocktailMenuItem[]>([]);

  useEffect(() => {
    fetchFeaturedCocktails().then(setCocktails).catch((err) => {
      console.error('Failed to load featured cocktails', err);
      setCocktails([]);
    });
  }, []);

  if (cocktails.length === 0) return null;

  return (
    <section className="py-28 px-6 md:px-10 bg-surface-elevated/40">
      <div className="max-w-7xl mx-auto">
        <p className="uppercase tracking-[0.3em] text-gold-light text-sm mb-4">Signature cocktails</p>
        <h2 className="font-heading text-4xl md:text-5xl tracking-[-0.02em] mb-16 max-w-xl">Wat we op jouw locatie serveren</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cocktails.map((cocktail) => (
            <div
              key={cocktail.id}
              className="rounded-xl p-7 bg-surface border border-white/5 hover:border-gold/30 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.5)] transition-transform duration-300 hover:-translate-y-1"
            >
              <span className="uppercase tracking-widest text-xs text-muted">{cocktail.category}</span>
              <h3 className="font-heading text-xl mt-2 mb-3">{cocktail.name}</h3>
              <p className="text-muted leading-[1.7]">{cocktail.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
