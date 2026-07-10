import { useState } from 'react';

export function AboutSection() {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <section id="onze-aanpak" className="py-12 md:py-28 px-6 md:px-10 scroll-mt-24">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-16 items-center">
        <div className="relative rounded-2xl overflow-hidden aspect-[4/5] bg-surface-elevated shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)]">
          {!imageFailed && (
            <img
              src="/OldImages/Vuurcock.png"
              alt="Close-up van een cocktail met vuur-garnering bij The Old Fashioned"
              className="w-full h-full object-cover"
              onError={() => setImageFailed(true)}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>
        <div>
          <p className="uppercase tracking-[0.3em] text-gold-light text-base mb-3 md:mb-4">Onze aanpak</p>
          <h2 className="font-heading text-3xl md:text-5xl tracking-[-0.02em] mb-4 md:mb-6 text-balance md:[text-wrap:normal]">Wij verzorgen de complete ervaring</h2>

          {/* Mobile: condensed to fit one screen without scrolling */}
          <div className="md:hidden">
            <p className="text-prose text-base leading-[1.6] mb-3">
              Van bartenders tot materialen: The Old Fashioned neemt de complete cocktailervaring mee naar jouw locatie &mdash; met dezelfde huisgemaakte siropen, verse ingredienten en signature recepten als in onze bar in Rijssen.
            </p>
            <p className="text-prose text-base leading-[1.6]">
              We stellen een cocktailmenu op maat samen, van tijdloze klassiekers tot creaties met rook en vuur, en bouwen op de dag zelf een volledige bar op. Jij hoeft niets te regelen &mdash; behalve genieten.
            </p>
          </div>

          {/* Desktop/tablet: full copy, unchanged */}
          <div className="hidden md:block">
            <p className="text-prose text-xl leading-[1.7] mb-5">
              Van materialen tot bartenders: The Old Fashioned neemt de volledige cocktailervaring mee naar jouw locatie. Onze bartenders werken met dezelfde huisgemaakte siropen, verse ingredienten en signature recepten als in de bar in Rijssen &mdash; alleen dan bij jou op het feest.
            </p>
            <p className="text-prose text-xl leading-[1.7] mb-5">
              We beginnen met een gesprek over de gelegenheid, het gezelschap en de smaken die jullie zoeken. Op basis daarvan stellen we een cocktailmenu op maat samen, van tijdloze klassiekers tot verrassende creaties met rook en vuur.
            </p>
            <p className="text-prose text-xl leading-[1.7]">
              Op de dag zelf bouwen we een complete bar op, verzorgen glaswerk, ijs en garnering, en serveren met oog voor detail. Of het nu gaat om een bruiloft, bedrijfsborrel of intieme workshop bij je thuis: wij zorgen dat de sfeer, smaak en presentatie kloppen. Jij hoeft niets te regelen &mdash; behalve genieten.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
