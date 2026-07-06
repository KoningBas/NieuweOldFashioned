import type { ServicePackage } from '../../../shared/types/db';

interface Props {
  packages: ServicePackage[];
  selectedPackageId: string | null;
  eventType: string;
  onSelectPackage: (id: string) => void;
  onEventTypeChange: (value: string) => void;
  onNext: () => void;
}

const EVENT_TYPES = ['Bruiloft', 'Bedrijfsborrel', 'Verjaardag', 'Festival', 'Thuisfeest', 'Anders'];

export function Step1Package({ packages, selectedPackageId, eventType, onSelectPackage, onEventTypeChange, onNext }: Props) {
  return (
    <div>
      <h3 className="font-heading text-2xl mb-6">Kies je pakket</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        {packages.map((pkg) => {
          const selected = pkg.id === selectedPackageId;
          return (
            <button
              key={pkg.id}
              type="button"
              onClick={() => onSelectPackage(pkg.id)}
              className={`text-left rounded-xl p-6 border transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light ${
                selected ? 'border-gold bg-gold/10 shadow-[0_0_0_1px_rgba(200,146,42,0.4)]' : 'border-white/10 bg-surface-elevated hover:border-white/25'
              }`}
            >
              <div className="font-heading text-lg mb-2">{pkg.package_name}</div>
              <div className="text-muted text-sm leading-[1.6]">{pkg.description}</div>
              <div className="text-gold-light mt-3">&euro;{pkg.price} {pkg.price_unit === 'per_cocktail' ? 'per cocktail' : 'per persoon'}</div>
            </button>
          );
        })}
      </div>

      <h3 className="font-heading text-2xl mb-6">Type evenement</h3>
      <div className="flex flex-wrap gap-3 mb-10">
        {EVENT_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onEventTypeChange(type)}
            className={`rounded-full px-5 py-2.5 border text-sm transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light ${
              eventType === type ? 'border-gold bg-gold text-surface' : 'border-white/15 text-muted hover:border-white/30'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={!selectedPackageId || !eventType}
        onClick={onNext}
        className="rounded-full px-8 py-4 bg-gradient-to-b from-gold-light to-primary-dark text-surface font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0 transition-transform duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light"
      >
        Volgende stap
      </button>
    </div>
  );
}
