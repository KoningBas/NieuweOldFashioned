import { useState } from 'react';
import type { ServicePackage } from '../../../shared/types/db';

interface Props {
  packages: ServicePackage[];
  selectedPackageId: string | null;
  eventType: string;
  onSelectPackage: (id: string) => void;
  onEventTypeChange: (value: string) => void;
  onNext: () => void;
}

// Workshops get their own photo; the bartending / cocktail service uses the pour shot.
function imageForPackage(pkg: ServicePackage): string {
  return /workshop/i.test(pkg.package_name) ? '/OldImages/CocktailTiki.jpg' : '/OldImages/CocktailPour.jpg';
}

export function Step1Package({ packages, selectedPackageId, eventType, onSelectPackage, onEventTypeChange, onNext }: Props) {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  return (
    <div>
      <h3 className="font-heading text-3xl mb-6">Kies je pakket</h3>
      <div className="mb-12">
        {packages.map((pkg) => {
          const selected = pkg.id === selectedPackageId;
          const imageSrc = imageForPackage(pkg);
          const imageFailed = failedImages.has(imageSrc);
          return (
            <button
              key={pkg.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelectPackage(pkg.id)}
              className={`group grid w-full grid-cols-1 sm:grid-cols-[minmax(0,42%)_1fr] overflow-hidden rounded-2xl border text-left transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2 ${
                selected ? 'border-gold shadow-[0_0_0_1px_rgba(200,146,42,0.4),0_25px_50px_-25px_rgba(200,146,42,0.35)]' : 'border-white/10 hover:border-white/25'
              }`}
            >
              <div className="relative aspect-video sm:aspect-auto sm:min-h-full overflow-hidden bg-surface">
                {!imageFailed ? (
                  <img
                    src={imageSrc}
                    alt={`${pkg.package_name} — sfeerbeeld`}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    onError={() => setFailedImages((prev) => new Set(prev).add(imageSrc))}
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-surface-elevated to-surface" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                <div className="absolute inset-0 bg-gold/10 mix-blend-multiply" />
                {selected && (
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-gold px-3 py-1 text-sm font-medium text-surface">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                    Geselecteerd
                  </span>
                )}
              </div>
              <div className="flex flex-col justify-center gap-2 bg-surface-elevated p-6 md:p-7">
                <div className="font-heading text-2xl">{pkg.package_name}</div>
                <div className="text-prose text-base leading-[1.6]">{pkg.description}</div>
                <div className="mt-1 text-gold-light text-lg">
                  &euro;{pkg.price} {pkg.price_unit === 'per_cocktail' ? 'per cocktail' : 'per persoon'}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <h3 className="font-heading text-3xl mb-6">Type evenement</h3>
      <label className="block mb-12">
        <input
          type="text"
          value={eventType}
          placeholder="Bijv. Bruiloft"
          onChange={(e) => onEventTypeChange(e.target.value)}
          className="w-full rounded-lg bg-surface border border-white/15 px-5 py-3.5 text-lg text-white placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light"
        />
      </label>

      <button
        type="button"
        disabled={!selectedPackageId || !eventType.trim()}
        onClick={onNext}
        className="btn-primary rounded-full px-6 py-2.5 text-base font-body font-semibold disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
      >
        Verder
      </button>
    </div>
  );
}
