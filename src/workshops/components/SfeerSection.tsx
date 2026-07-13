import { useCallback, useEffect, useRef, useState } from 'react';

const SFEER_PHOTOS: { src: string; alt: string; className?: string }[] = [
  { src: '/OldImages/CocktailPour.jpg', alt: 'Bartender schenkt een cocktail uit een gouden shaker' },
  { src: '/OldImages/HighCocktail.jpg', alt: 'Cocktail in een hoog glas op de bar' },
  { src: '/OldImages/pornstar-martini.jpg', alt: 'Pornstar Martini met passievrucht, een van de cocktails die je zelf maakt' },
  { src: '/OldImages/Rosalia.png', alt: 'Cocktail met munt geserveerd in een geribbeld wijnglas' },
  { src: '/OldImages/CocktailBloem.jpg', alt: 'Roze cocktail gegarneerd met een verse bloem', className: 'object-bottom' },
];

export function SfeerSection() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const handleScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const i = max > 0 ? Math.round((el.scrollLeft / max) * (SFEER_PHOTOS.length - 1)) : 0;
    setActive((prev) => (prev === i ? prev : i));
  };

  // Tablet & laptop: zelfde swipe/snap-carousel als mobiel, maar met meerdere foto's
  // per beeld. Elke "stop" is een echte scroll-snap-positie (dus 1 stip per stop),
  // opnieuw gemeten bij resize omdat het aantal zichtbare kaarten per breakpoint verschilt.
  const deskTrackRef = useRef<HTMLDivElement>(null);
  const [deskStops, setDeskStops] = useState<number[]>([0]);
  const [deskActive, setDeskActive] = useState(0);

  const measureStops = useCallback(() => {
    const el = deskTrackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 0) {
      setDeskStops([0]);
      setDeskActive(0);
      return;
    }
    const stops: number[] = [];
    for (const child of Array.from(el.children)) {
      const left = Math.min((child as HTMLElement).offsetLeft, max);
      if (!stops.some((s) => Math.abs(s - left) < 8)) stops.push(left);
    }
    if (stops[stops.length - 1] < max - 8) stops.push(max);
    setDeskStops(stops);
  }, []);

  useEffect(() => {
    measureStops();
    const el = deskTrackRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => measureStops());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measureStops]);

  const handleDeskScroll = () => {
    const el = deskTrackRef.current;
    if (!el) return;
    const sl = el.scrollLeft;
    let best = 0;
    let bestDist = Infinity;
    deskStops.forEach((s, i) => {
      const d = Math.abs(s - sl);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setDeskActive((prev) => (prev === best ? prev : best));
  };

  const scrollDeskTo = (i: number) => {
    const el = deskTrackRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(i, deskStops.length - 1));
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ left: deskStops[clamped], behavior: reduce ? 'auto' : 'smooth' });
  };

  return (
    <section
      id="verloop"
      className="py-12 md:py-28 px-6 md:px-10 bg-surface-elevated/40 scroll-mt-24"
    >
      <div className="max-w-3xl mx-auto flex flex-col items-center text-center">
        <p className="uppercase tracking-[0.3em] text-gold-light text-base mb-3 md:mb-4">Het verloop</p>
        <h2 className="font-heading text-3xl md:text-5xl tracking-[-0.02em] mb-4 md:mb-6 text-balance">
          Zo ziet een workshop eruit
        </h2>
        <p className="text-prose text-base md:text-xl leading-[1.6] md:leading-[1.7] max-w-xl text-pretty">
          Eerst de tools en de techniek, dan shaken, proeven en bijstellen tot het glas klopt.
          Reken op anderhalf tot twee uur met Bites, en op twee tot tweeënhalf uur als je er
          Streetfood bij neemt.
        </p>
      </div>

      {/* Mobile: swipe carousel — grote, scherpe sfeerfoto's */}
      <div className="md:hidden -mx-6 mt-8 mb-8">
        <div
          ref={trackRef}
          onScroll={handleScroll}
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-6 scroll-px-6 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {SFEER_PHOTOS.map((p) => (
            <div
              key={p.src}
              className="snap-start shrink-0 w-[80%] aspect-[4/5] overflow-hidden rounded-2xl bg-surface-elevated shadow-[0_20px_40px_-18px_rgba(0,0,0,0.8)]"
            >
              <img
                src={p.src}
                alt={p.alt}
                loading="lazy"
                className={`w-full h-full object-cover ${p.className ?? ''}`}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-2 mt-4" aria-hidden="true">
          {SFEER_PHOTOS.map((p, i) => (
            <span
              key={p.src}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === active ? 'w-5 bg-gold-light' : 'w-1.5 bg-white/25'}`}
            />
          ))}
        </div>
      </div>

      {/* Tablet & laptop: zelfde swipe/snap-carousel, meer foto's zichtbaar + pijlen en klikbare stippen */}
      <div className="hidden md:block max-w-7xl mx-auto mt-14 mb-14">
        <div className="relative">
          <div
            ref={deskTrackRef}
            onScroll={handleDeskScroll}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth motion-reduce:scroll-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {SFEER_PHOTOS.map((p) => (
              <div
                key={p.src}
                className="snap-start shrink-0 w-[44%] lg:w-[29%] aspect-[4/5] overflow-hidden rounded-2xl bg-surface-elevated shadow-[0_20px_40px_-18px_rgba(0,0,0,0.8)]"
              >
                <img
                  src={p.src}
                  alt={p.alt}
                  loading="lazy"
                  className={`w-full h-full object-cover ${p.className ?? ''}`}
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => scrollDeskTo(deskActive - 1)}
            disabled={deskActive === 0}
            aria-label="Vorige foto's"
            className="absolute left-3 top-1/2 -translate-y-1/2 grid place-items-center h-11 w-11 rounded-full bg-black/55 backdrop-blur-sm border border-white/15 text-white transition-[opacity,background-color,border-color,transform] duration-200 hover:bg-black/75 hover:border-gold-light/60 hover:text-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light active:scale-95 disabled:opacity-0 disabled:pointer-events-none"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => scrollDeskTo(deskActive + 1)}
            disabled={deskActive >= deskStops.length - 1}
            aria-label="Volgende foto's"
            className="absolute right-3 top-1/2 -translate-y-1/2 grid place-items-center h-11 w-11 rounded-full bg-black/55 backdrop-blur-sm border border-white/15 text-white transition-[opacity,background-color,border-color,transform] duration-200 hover:bg-black/75 hover:border-gold-light/60 hover:text-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light active:scale-95 disabled:opacity-0 disabled:pointer-events-none"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        <div className="flex justify-center gap-1 mt-4">
          {deskStops.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollDeskTo(i)}
              aria-label={`Ga naar fotogroep ${i + 1}`}
              aria-current={i === deskActive}
              className="group grid place-items-center py-3 px-2 focus-visible:outline-none"
            >
              <span
                className={`block h-1.5 rounded-full transition-[width,background-color] duration-300 group-focus-visible:ring-2 group-focus-visible:ring-gold-light group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-background ${i === deskActive ? 'w-5 bg-gold-light' : 'w-1.5 bg-white/25 group-hover:bg-white/45'}`}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto flex flex-col items-center text-center">
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Binnenkort beschikbaar"
          className="inline-flex items-center gap-3 rounded-md px-8 py-4 font-body text-base sm:text-lg border-2 border-white/20 text-prose cursor-not-allowed opacity-60 select-none"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download het workshopmenu
        </button>
        <span className="mt-4 text-sm uppercase tracking-[0.22em] text-prose/80">PDF volgt binnenkort</span>
      </div>
    </section>
  );
}
