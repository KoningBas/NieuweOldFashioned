import { useState, type ReactNode } from 'react';
import type { ServicePackage } from '../../../shared/types/db';

interface Props {
  packages: ServicePackage[];
  selectedPackageId: string | null;
  eventType: string;
  onSelectPackage: (id: string) => void;
  onEventTypeChange: (value: string) => void;
  onNext: () => void;
}

const iconProps = {
  width: 30,
  height: 30,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const EVENT_TYPES: { label: string; icon: ReactNode }[] = [
  {
    label: 'Bruiloft',
    icon: (
      <svg {...iconProps}>
        <path d="M12 20.5S3.5 15 3.5 9.2A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 8.5 2.2C20.5 15 12 20.5 12 20.5Z" />
      </svg>
    ),
  },
  {
    label: 'Bedrijfsborrel',
    icon: (
      <svg {...iconProps}>
        <path d="M4 4h16l-8 9-8-9Z" />
        <path d="M12 13v6" />
        <path d="M8 20h8" />
      </svg>
    ),
  },
  {
    label: 'Verjaardag',
    icon: (
      <svg {...iconProps}>
        <path d="M4 21h16v-7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7Z" />
        <path d="M4 16.5c1.6 1.4 3.1 1.4 4 0s2.4-1.4 4 0 3.1 1.4 4 0" />
        <path d="M12 12V8" />
        <path d="M12 8c-1-1 .6-2.4 0-4-.6 1.6 1 3 0 4Z" />
      </svg>
    ),
  },
  {
    label: 'Festival',
    icon: (
      <svg {...iconProps}>
        <path d="M6 21V4" />
        <path d="M6 4h11l-2.5 3.5L17 11H6" />
      </svg>
    ),
  },
  {
    label: 'Thuisfeest',
    icon: (
      <svg {...iconProps}>
        <path d="M4 11 12 4l8 7" />
        <path d="M6 10v10h12V10" />
        <path d="M10 20v-5h4v5" />
      </svg>
    ),
  },
  {
    label: 'Anders',
    icon: (
      <svg {...iconProps}>
        <path d="M12 3l1.9 6.1L20 11l-6.1 1.9L12 19l-1.9-6.1L4 11l6.1-1.9L12 3Z" />
      </svg>
    ),
  },
];

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
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-12">
        {EVENT_TYPES.map(({ label, icon }) => {
          const selected = eventType === label;
          return (
            <button
              key={label}
              type="button"
              aria-pressed={selected}
              onClick={() => onEventTypeChange(label)}
              className={`group relative flex flex-col items-center justify-center gap-3 rounded-xl px-3 py-7 border text-center transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2 ${
                selected ? 'border-gold bg-gold/10 shadow-[0_0_0_1px_rgba(200,146,42,0.35)]' : 'border-white/10 bg-surface hover:border-white/25'
              }`}
            >
              {selected && (
                <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-surface">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                </span>
              )}
              <span className={`transition-colors duration-200 ${selected ? 'text-gold-light' : 'text-gold/70 group-hover:text-gold-light'}`}>
                {icon}
              </span>
              <span className={`text-lg ${selected ? 'text-white' : 'text-prose'}`}>{label}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={!selectedPackageId || !eventType}
        onClick={onNext}
        className="rounded-full px-8 py-4 bg-gradient-to-b from-gold-light to-primary-dark text-surface font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0 transition-transform duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
      >
        Volgende stap
      </button>
    </div>
  );
}
