type Arrangement = {
  naam: string;
  prijs: string;
  duur: string;
  omschrijving: string;
  foto: string;
  alt: string;
};

const ARRANGEMENTEN: Arrangement[] = [
  {
    naam: 'Bites',
    prijs: '€ 32 p.p.',
    duur: '1,5 tot 2 uur',
    omschrijving:
      'Een ruime borrelplank die tijdens de workshop op tafel komt. Genoeg om de avond op te bouwen, zonder dat je aan tafel gaat zitten.',
    foto: '/OldImages/bites-borrelplank.jpg',
    alt: 'Borrelplank op gouden schalen: nacho’s, kip, calamares, krulfriet en salade, met twee cocktails erbij',
  },
  {
    naam: 'Streetfood',
    prijs: '€ 42 p.p.',
    duur: '2 tot 2,5 uur',
    omschrijving:
      'Een compleet avondarrangement in twee gangen: een voorgerecht en een hoofdgerecht. Je maakt je cocktails, daarna schuif je aan.',
    foto: '/OldImages/streetfood-spareribs.jpg',
    alt: 'Gelakte spareribs in krantenpapier op een houten plank, met een cocktail op de achtergrond',
  },
];

export function ArrangementenSection() {
  return (
    <section
      id="arrangementen"
      className="py-12 md:py-28 px-6 md:px-10 bg-surface-elevated/40 scroll-mt-24"
    >
      <div className="max-w-7xl mx-auto">
        <div className="max-w-3xl mx-auto flex flex-col items-center text-center mb-8 md:mb-16">
          <p className="uppercase tracking-[0.3em] text-gold-light text-base mb-3 md:mb-4">Kies je etenarrangement</p>
          <h2 className="font-heading text-3xl md:text-5xl tracking-[-0.02em] mb-4 md:mb-6 text-balance">
            Bites of Streetfood
          </h2>
          <p className="text-prose text-base md:text-xl leading-[1.6] md:leading-[1.7] max-w-xl text-pretty">
            Bij een workshop in de bar eet je mee. Je kiest vooraf Bites of Streetfood, en dat bepaalt
            meteen de prijs en hoe lang je blijft.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          {ARRANGEMENTEN.map((a) => (
            <div key={a.naam} className="flex flex-col">
              <div className="relative rounded-2xl overflow-hidden aspect-[3/2] md:aspect-[4/3] bg-surface-elevated shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)]">
                <img src={a.foto} alt={a.alt} loading="lazy" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>

              <div className="flex items-baseline justify-between gap-4 mt-5 md:mt-7">
                <h3 className="font-heading text-2xl md:text-3xl text-white tracking-[-0.01em]">{a.naam}</h3>
                <p className="font-heading text-xl md:text-2xl text-gold-light whitespace-nowrap">{a.prijs}</p>
              </div>

              <p className="font-body text-base text-prose mt-1">{a.duur}</p>

              <p className="text-prose text-base md:text-lg leading-[1.7] mt-3 md:mt-4 max-w-[52ch] text-pretty">
                {a.omschrijving}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
