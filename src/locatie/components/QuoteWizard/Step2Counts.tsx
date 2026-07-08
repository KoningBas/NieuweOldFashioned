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

const inputClass =
  'w-full rounded-lg bg-surface border border-white/15 px-5 py-3.5 text-lg text-white placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light';
const labelClass = 'block text-lg text-prose mb-3';

export function Step2Counts({ pkg, guestCount, cocktailCount, onGuestCountChange, onCocktailCountChange, onNext, onBack }: Props) {
  const isPerCocktail = pkg.price_unit === 'per_cocktail';
  const canProceed = guestCount >= 1 && (!isPerCocktail || cocktailCount >= pkg.min_quantity);

  return (
    <div>
      <h3 className="font-heading text-3xl mb-6">Aantal gasten en cocktails</h3>

      <label className="block mb-8">
        <span className={labelClass}>Aantal gasten</span>
        <input
          type="number"
          min={1}
          value={guestCount === 0 ? '' : guestCount}
          placeholder="Bijv. 100"
          onChange={(e) => onGuestCountChange(e.target.value === '' ? 0 : Number(e.target.value))}
          className={inputClass}
        />
      </label>

      {isPerCocktail && (
        <div className="mb-10">
          <label className="block">
            <span className={labelClass}>Aantal cocktails (min. {pkg.min_quantity})</span>
            <input
              type="number"
              min={pkg.min_quantity}
              value={cocktailCount === 0 ? '' : cocktailCount}
              placeholder="Bijv. 100"
              onChange={(e) => onCocktailCountChange(e.target.value === '' ? 0 : Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <p className="mt-3 text-base text-prose leading-[1.7]">
            Reken op &eacute;&eacute;n cocktail per gast. Niet iedereen drinkt evenveel: kinderen en niet-drinkers slaan er een over,
            anderen nemen er twee of drie. Over het hele gezelschap kom je zo gemiddeld op ongeveer &eacute;&eacute;n per persoon uit.
          </p>
        </div>
      )}

      <div className="flex gap-4">
        <button type="button" onClick={onBack} className="rounded-full px-6 py-2.5 text-base border border-white/20 text-white hover:border-gold-light active:opacity-90 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2">
          Terug
        </button>
        <button type="button" disabled={!canProceed} onClick={onNext} className="btn-primary rounded-full px-6 py-2.5 text-base font-body font-semibold disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2">
          Verder
        </button>
      </div>
    </div>
  );
}
