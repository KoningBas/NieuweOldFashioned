export function Hero() {
  return (
    <section className="relative min-h-[92vh] flex items-end pb-24 pt-32 px-6 md:px-10 overflow-hidden">
      <img
        src="/OldImages/AbgarLocatie.jpg"
        alt="Bartender bereidt cocktails op locatie tijdens een evenement"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/70 to-surface/20" />
      <div className="absolute inset-0 bg-gradient-to-r from-surface/60 via-transparent to-transparent" />
      <div
        className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(circle, #C8922A, transparent 70%)' }}
      />

      <div className="relative max-w-7xl mx-auto w-full">
        <p className="uppercase tracking-[0.3em] text-gold-light text-sm mb-6">Op jouw locatie</p>
        <h1 className="font-heading text-5xl md:text-7xl leading-[1.05] tracking-[-0.02em] max-w-3xl mb-6">
          Cocktails op Locatie
        </h1>
        <p className="text-muted text-xl leading-[1.7] max-w-xl mb-10">
          The Old Fashioned komt naar jouw feest, bruiloft, bedrijfsborrel of thuisfeest &mdash; met bartenders, materialen en een cocktailmenu op maat.
        </p>
        <div className="flex flex-wrap gap-4">
          <a
            href="#offerte"
            className="rounded-full px-8 py-4 bg-gradient-to-b from-gold-light to-primary-dark text-surface font-medium shadow-[0_8px_30px_-6px_rgba(200,146,42,0.6)] hover:shadow-[0_10px_40px_-4px_rgba(200,146,42,0.8)] hover:-translate-y-0.5 active:translate-y-0 transition-transform duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
          >
            Vraag een offerte aan
          </a>
          <a
            href="#pakketten"
            className="rounded-full px-8 py-4 border border-white/20 text-white hover:border-gold-light hover:text-gold-light hover:-translate-y-0.5 active:translate-y-0 transition-transform duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
          >
            Bekijk de mogelijkheden
          </a>
        </div>
      </div>
    </section>
  );
}
