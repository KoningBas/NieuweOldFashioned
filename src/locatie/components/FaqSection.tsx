const PLACEHOLDER_QUESTIONS = [
  'Hoe ver van tevoren moet ik reserveren?',
  'Voor hoeveel personen verzorgen jullie cocktails?',
  'Bieden jullie ook alcoholvrije cocktails aan?',
];

export function FaqSection() {
  return (
    <section id="faq" className="py-12 md:py-28 px-6 md:px-10 scroll-mt-24">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8 md:mb-14">
          <p className="uppercase tracking-[0.3em] text-gold-light text-base mb-3 md:mb-4">Goed om te weten</p>
          <h2 className="font-heading text-[1.7rem] md:text-5xl tracking-[-0.02em] mb-4 md:mb-6 whitespace-nowrap md:whitespace-normal">
            Veelgestelde vragen
          </h2>
          <p className="text-prose text-base md:text-xl leading-[1.6] md:leading-[1.7] max-w-xl mx-auto text-pretty">
            Binnenkort vind je hier de antwoorden op de meestgestelde vragen over cocktails op locatie.
          </p>
        </div>

        {/* Placeholder accordion — non-interactive, reserves the layout */}
        <ul className="flex flex-col gap-2.5 md:gap-3" aria-hidden="true">
          {PLACEHOLDER_QUESTIONS.map((q) => (
            <li
              key={q}
              className="flex items-center justify-between gap-4 rounded-xl border border-white/8 bg-surface-elevated/40 px-5 py-3.5 md:px-6 md:py-5 opacity-60 select-none"
            >
              <span className="font-heading text-base md:text-lg text-white/70">{q}</span>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted shrink-0"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </li>
          ))}
        </ul>

        <p className="text-center mt-8 text-sm uppercase tracking-[0.22em] text-muted/80">
          Binnenkort beschikbaar
        </p>
      </div>
    </section>
  );
}
