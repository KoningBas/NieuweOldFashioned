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
        <label className="block mb-4">
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
      )}

      {isPerCocktail && (
        <div className="flex gap-3 rounded-xl border border-gold/20 bg-gold/[0.06] p-4 mb-10">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-gold-light" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5" />
            <path d="M12 8h.01" />
          </svg>
          <div>
            <p className="text-lg text-gold-light mb-1">Minimaal 1 cocktail per persoon</p>
            <p className="text-base text-prose leading-[1.7]">
              Reken op &eacute;&eacute;n cocktail per gast. Niet iedereen drinkt evenveel: kinderen en niet-drinkers slaan er een over,
              anderen nemen er twee of drie. Over het hele gezelschap kom je zo gemiddeld op ongeveer &eacute;&eacute;n per persoon uit.
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <button type="button" onClick={onBack} className="rounded-full px-8 py-4 border border-white/20 text-white hover:border-gold-light hover:-translate-y-0.5 active:translate-y-0 transition-transform duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2">
          Terug
        </button>
        <button type="button" disabled={!canProceed} onClick={onNext} className="rounded-full px-8 py-4 bg-gradient-to-b from-gold-light to-primary-dark text-surface font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0 transition-transform duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2">
          Volgende stap
        </button>
      </div>
    </div>
  );
}
