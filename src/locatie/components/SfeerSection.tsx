export function SfeerSection() {
  return (
    <section
      id="cocktailkaart"
      className="py-28 px-6 md:px-10 bg-surface-elevated/40 scroll-mt-24"
    >
      <div className="max-w-3xl mx-auto flex flex-col items-center text-center">
        <p className="uppercase tracking-[0.3em] text-gold-light text-base mb-4">De cocktailkaart</p>
        <h2 className="font-heading text-4xl md:text-5xl tracking-[-0.02em] mb-6 text-balance">
          Proef de sfeer van onze cocktails
        </h2>
        <p className="text-prose text-xl leading-[1.7] max-w-xl text-pretty">
          Van rijke klassiekers tot eigenzinnige creaties met rook, vuur en verse
          seizoensingredienten &mdash; onze kaart brengt de sfeer van The Old Fashioned
          naar jouw evenement.
        </p>
      </div>

      <div className="max-w-7xl mx-auto mt-14 mb-14">
        <div className="grid grid-cols-3 grid-rows-2 gap-3 md:gap-4 aspect-[16/9] md:aspect-[2/1]">
          <div className="col-span-1 row-span-2 overflow-hidden">
            <img
              src="/OldImages/CocktailPour.jpg"
              alt="Bartender schenkt een cocktail over uit een gouden shaker"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="overflow-hidden">
            <img
              src="/OldImages/Kaart.png"
              alt="Gast bekijkt de cocktailkaart van The Old Fashioned"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="overflow-hidden">
            <img
              src="/OldImages/Rosalia.png"
              alt="Cocktail met munt geserveerd in een geribbeld wijnglas"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="overflow-hidden">
            <img
              src="/OldImages/CocktailTiki.jpg"
              alt="Groene tiki-cocktail in een gedecoreerd tikiglas"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="overflow-hidden">
            <img
              src="/OldImages/CocktailBloem.jpg"
              alt="Roze cocktail gegarneerd met een verse bloem"
              className="w-full h-full object-cover object-bottom"
            />
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto flex flex-col items-center text-center">
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Binnenkort beschikbaar"
          className="inline-flex items-center gap-3 rounded-md px-8 py-4 font-body text-base sm:text-lg border-2 border-white/20 text-muted cursor-not-allowed opacity-60 select-none"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download de cocktailkaart
        </button>
        <span className="mt-4 text-sm uppercase tracking-[0.22em] text-muted/80">PDF volgt binnenkort</span>
      </div>
    </section>
  );
}
