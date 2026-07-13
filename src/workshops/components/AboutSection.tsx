import { useState } from 'react';

export function AboutSection() {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <section id="zo-werkt-het" className="py-12 md:py-28 px-6 md:px-10 scroll-mt-24">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-16 items-center">
        <div className="relative rounded-2xl overflow-hidden aspect-[4/5] bg-surface-elevated shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)]">
          {!imageFailed && (
            <img
              src="/OldImages/Vuurcock.png"
              alt="Cocktail met vuur-garnering, gemaakt tijdens een workshop bij The Old Fashioned"
              className="w-full h-full object-cover"
              onError={() => setImageFailed(true)}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>
        <div>
          <p className="uppercase tracking-[0.3em] text-gold-light text-base mb-3 md:mb-4">Zo werkt het</p>
          <h2 className="font-heading text-3xl md:text-5xl tracking-[-0.02em] mb-4 md:mb-6 text-balance md:[text-wrap:normal]">Twee cocktails, jouw handen</h2>

          {/* Mobile: condensed to fit one screen without scrolling */}
          <div className="md:hidden">
            <p className="text-prose text-base leading-[1.6] mb-3">
              Je krijgt je eigen set tools: shaker, strainer, jigger. De bartender laat zien waar elk stuk voor dient, en waarom de verhoudingen in een recept kloppen.
            </p>
            <p className="text-prose text-base leading-[1.6]">
              Samen maak je twee cocktails. Welke twee kies je in overleg met de bartender, van een Pornstar Martini tot een Amaretto Sour of een Mojito. Zonder alcohol kan ook, met dezelfde techniek en dezelfde presentatie.
            </p>
          </div>

          {/* Desktop/tablet: full copy */}
          <div className="hidden md:block">
            <p className="text-prose text-xl leading-[1.7] mb-5">
              Je staat achter je eigen set tools: shaker, strainer, jigger. De bartender laat zien waar elk stuk voor dient, hoe je een goede shake opbouwt, en waarom de verhoudingen in een recept kloppen. Geen show om naar te kijken, maar werk dat je zelf doet.
            </p>
            <p className="text-prose text-xl leading-[1.7] mb-5">
              Samen maak je twee cocktails. Welke twee kies je in overleg met de bartender: een Pornstar Martini, een Amaretto Sour, een Mojito. Elk recept nemen we door, van de basis tot de garnering. Drinkt iemand geen alcohol? Dan schud je dezelfde cocktails zonder sterke drank.
            </p>
            <p className="text-prose text-xl leading-[1.7]">
              Wat je maakt, drink je zelf op. Wil je na afloop nog iets van de kaart, dan schenken we door voor 9 euro per cocktail.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
