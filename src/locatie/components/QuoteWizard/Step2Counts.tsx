import type { ServicePackage } from '../../../shared/types/db';

interface Props {
  pkg: ServicePackage;
  guestCount: number;
  cocktailCount: number;
  onGuestCountChange: (value: number) => void;
  onCocktailCountChange: (value: number) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step2Counts({ pkg, guestCount, cocktailCount, onGuestCountChange, onCocktailCountChange, onNext, onBack }: Props) {
  const isPerCocktail = pkg.price_unit === 'per_cocktail';

  return (
    <div>
      <h3 className="font-heading text-2xl mb-6">Aantal gasten en cocktails</h3>

      <label className="block mb-8">
        <span className="block text-sm uppercase tracking-widest text-muted mb-3">Aantal gasten</span>
        <input
          type="number"
          min={1}
          value={guestCount}
          onChange={(e) => onGuestCountChange(Number(e.target.value))}
          className="w-full rounded-lg bg-surface border border-white/15 px-5 py-3.5 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light"
        />
      </label>

      {isPerCocktail && (
        <label className="block mb-8">
          <span className="block text-sm uppercase tracking-widest text-muted mb-3">Aantal cocktails (min. {pkg.min_quantity})</span>
          <input
            type="number"
            min={pkg.min_quantity}
            value={cocktailCount}
            onChange={(e) => onCocktailCountChange(Number(e.target.value))}
            className="w-full rounded-lg bg-surface border border-white/15 px-5 py-3.5 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light"
          />
        </label>
      )}

      <div className="flex gap-4">
        <button type="button" onClick={onBack} className="rounded-full px-8 py-4 border border-white/20 text-white hover:border-gold-light hover:-translate-y-0.5 active:translate-y-0 transition-transform duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2">
          Terug
        </button>
        <button type="button" onClick={onNext} className="rounded-full px-8 py-4 bg-gradient-to-b from-gold-light to-primary-dark text-surface font-medium hover:-translate-y-0.5 active:translate-y-0 transition-transform duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2">
          Volgende stap
        </button>
      </div>
    </div>
  );
}
