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

// On-location workshop business rules. The guest minimum mirrors the workshops
// page FAQ ("op locatie werken we vanaf 15 personen"); the workshop is built
// around each guest making two cocktails, so that is the per-person floor.
const WORKSHOP_MIN_GUESTS = 15;
const WORKSHOP_MIN_COCKTAILS_PP = 2;

const inputClass =
  'w-full rounded-lg bg-surface border border-white/15 px-4 py-3 text-base md:px-5 md:py-3.5 md:text-lg text-white placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light';
const labelClass = 'block text-sm md:text-lg text-white mb-2 md:mb-3';

export function Step2Counts({ pkg, guestCount, cocktailCount, onGuestCountChange, onCocktailCountChange, onNext, onBack }: Props) {
  const isPerCocktail = pkg.price_unit === 'per_cocktail';
  // Two shapes of the same step. Bartending (per cocktail) needs one guest and a
  // total cocktail count; the workshop (per person) runs from 15 guests and asks
  // how many cocktails each guest makes.
  const minGuests = isPerCocktail ? 1 : WORKSHOP_MIN_GUESTS;
  const minCocktails = isPerCocktail ? pkg.min_quantity : WORKSHOP_MIN_COCKTAILS_PP;
  const canProceed = guestCount >= minGuests && cocktailCount >= minCocktails;

  return (
    <div>
      <h3 className="font-heading text-base md:text-3xl mb-4 md:mb-6">Aantal gasten en cocktails</h3>

      <label className="block mb-4 md:mb-8">
        <span className={labelClass}>Aantal gasten{!isPerCocktail && ` (minimaal ${WORKSHOP_MIN_GUESTS})`}</span>
        <input
          type="number"
          min={minGuests}
          value={guestCount === 0 ? '' : guestCount}
          placeholder="Bijv. 100"
          onChange={(e) => onGuestCountChange(e.target.value === '' ? 0 : Number(e.target.value))}
          className={inputClass}
        />
      </label>

      {isPerCocktail ? (
        <div className="mb-5 md:mb-10">
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
          <p className="mt-2 md:mt-3 text-xs md:text-base text-white leading-snug md:leading-[1.7]">
            Reken op &eacute;&eacute;n cocktail per gast. Niet iedereen drinkt evenveel: kinderen en niet-drinkers slaan er een over,
            anderen nemen er twee of drie. Over het hele gezelschap kom je zo gemiddeld op ongeveer &eacute;&eacute;n per persoon uit.
          </p>
        </div>
      ) : (
        <div className="mb-5 md:mb-10">
          <label className="block">
            <span className={labelClass}>Aantal cocktails per persoon (minimaal {WORKSHOP_MIN_COCKTAILS_PP})</span>
            <input
              type="number"
              min={WORKSHOP_MIN_COCKTAILS_PP}
              value={cocktailCount === 0 ? '' : cocktailCount}
              placeholder="Bijv. 2"
              onChange={(e) => onCocktailCountChange(e.target.value === '' ? 0 : Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <p className="mt-2 md:mt-3 text-xs md:text-base text-white leading-snug md:leading-[1.7]">
            Elke gast maakt er zelf minimaal twee. Wil je dat gasten er meer maken, verhoog dit dan.
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
