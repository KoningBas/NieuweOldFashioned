import type { ServicePackage } from '../../../shared/types/db';

interface Props {
  packages: ServicePackage[];
  selectedPackageId: string | null;
  eventType: string;
  onSelectPackage: (id: string) => void;
  onEventTypeChange: (value: string) => void;
  onNext: () => void;
}

export function Step1Package({ packages, selectedPackageId, eventType, onSelectPackage, onEventTypeChange, onNext }: Props) {
  return (
    <div>
      <h3 className="font-heading text-base md:text-3xl mb-3 md:mb-6">Kies je pakket</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5 mb-5 md:mb-12">
        {packages.map((pkg) => {
          const selected = pkg.id === selectedPackageId;
          return (
            <button
              key={pkg.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelectPackage(pkg.id)}
              className={`flex h-full flex-col rounded-xl md:rounded-2xl border bg-surface p-4 md:p-6 text-left transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2 ${
                selected
                  ? 'border-gold shadow-[0_0_0_1px_rgba(200,146,42,0.4),0_25px_50px_-25px_rgba(200,146,42,0.35)]'
                  : 'border-white/10 hover:border-white/25'
              }`}
            >
              <span className={`font-heading text-lg leading-tight md:text-2xl ${selected ? 'text-gold-light' : 'text-white'}`}>
                {pkg.package_name}
              </span>
              <p className="mt-2 text-sm leading-[1.6] text-white md:mt-3 md:text-base">{pkg.description}</p>
              <div className="mt-3 text-base text-gold-light md:mt-4 md:text-lg">
                &euro;{pkg.price} {pkg.price_unit === 'per_cocktail' ? 'per cocktail' : 'per persoon'}
              </div>
            </button>
          );
        })}
      </div>

      <h3 className="font-heading text-base md:text-3xl mb-2 md:mb-6">Type evenement</h3>
      <label className="block mb-5 md:mb-12">
        <input
          type="text"
          value={eventType}
          placeholder="Bijv. Bruiloft"
          onChange={(e) => onEventTypeChange(e.target.value)}
          className="w-full rounded-lg bg-surface border border-white/15 px-4 py-3 text-base md:px-5 md:py-3.5 md:text-lg text-white placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light"
        />
      </label>

      <button
        type="button"
        disabled={!selectedPackageId || !eventType.trim()}
        onClick={onNext}
        className="btn-primary w-full md:w-auto rounded-full px-6 py-3 md:py-2.5 text-base font-body font-semibold disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
      >
        Verder
      </button>
    </div>
  );
}
