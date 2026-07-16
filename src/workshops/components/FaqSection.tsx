import { useState } from 'react';

type Faq = {
  question: string;
  answer: string;
  cta?: { href: string; label: string };
};

const FAQS: Faq[] = [
  {
    question: 'Vanaf hoeveel personen?',
    answer:
      'In de bar beginnen we bij 4 personen en geldt er geen bovengrens. Op locatie werken we vanaf 15 personen.',
  },
  {
    question: 'Hoe ver van tevoren reserveren?',
    answer:
      'Drie dagen vooraf is genoeg. Workshops kunnen elke dag van de week, ook in het weekend.',
  },
  {
    question: 'Welke cocktails maak je?',
    answer:
      'Twee, en die kies je in overleg met de bartender. Denk aan een Pornstar Martini, een Amaretto Sour of een Mojito.',
  },
  {
    question: 'Kan het zonder alcohol?',
    answer:
      'Ja. Je werkt met dezelfde tools, dezelfde techniek en dezelfde garnering, alleen zonder sterke drank.',
  },
  {
    question: 'Hoe lang duurt een workshop?',
    answer:
      'Met Bites blijf je anderhalf tot twee uur. Met Streetfood erbij wordt het twee tot tweeënhalf uur.',
  },
  {
    question: 'Zijn er ook workshops op locatie?',
    answer:
      'Ja. Vanaf 15 personen komen we naar je toe: thuis, op kantoor of in een zaal. Op de pagina Op Locatie zet je het in een offerte.',
    cta: { href: '/locatie/#offerte', label: 'Naar Op Locatie' },
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-12 md:py-28 px-6 md:px-10 scroll-mt-24">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8 md:mb-14">
          <p className="uppercase tracking-[0.3em] text-gold-light text-base mb-3 md:mb-4">Goed om te weten</p>
          <h2 className="font-heading text-[1.7rem] md:text-5xl tracking-[-0.02em] mb-4 md:mb-6 whitespace-nowrap md:whitespace-normal">
            Veelgestelde vragen
          </h2>
          <p className="text-prose text-base md:text-xl leading-[1.6] md:leading-[1.7] max-w-xl mx-auto text-pretty">
            De vragen die we het vaakst krijgen over onze workshops, met het antwoord erbij.
          </p>
        </div>

        <ul className="flex flex-col gap-2.5 md:gap-3">
          {FAQS.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <li
                key={item.question}
                className="overflow-hidden rounded-xl border border-white/8 bg-surface-elevated/40 transition-colors duration-200 hover:border-white/20 motion-reduce:transition-none"
              >
                <h3>
                  <button
                    type="button"
                    id={`faq-vraag-${index}`}
                    aria-expanded={isOpen}
                    aria-controls={`faq-antwoord-${index}`}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="flex w-full items-center justify-between gap-5 px-5 py-4 md:px-6 md:py-5 text-left cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:-outline-offset-2"
                  >
                    <span className="font-heading text-base md:text-xl leading-snug text-white">
                      {item.question}
                    </span>

                    {/* Plus die naar een min draait bij openen */}
                    <span
                      aria-hidden="true"
                      className={`relative block h-4 w-4 shrink-0 transition-colors duration-200 motion-reduce:transition-none ${
                        isOpen ? 'text-gold-light' : 'text-prose'
                      }`}
                    >
                      <span className="absolute left-0 top-1/2 h-px w-4 -translate-y-1/2 bg-current" />
                      <span
                        className={`absolute left-1/2 top-0 h-4 w-px -translate-x-1/2 bg-current origin-center transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                          isOpen ? 'rotate-90 scale-y-0' : 'rotate-0 scale-y-100'
                        }`}
                      />
                    </span>
                  </button>
                </h3>

                <div
                  id={`faq-antwoord-${index}`}
                  role="region"
                  aria-labelledby={`faq-vraag-${index}`}
                  className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                    isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                  }`}
                >
                  <div
                    className={`overflow-hidden transition-opacity duration-300 ease-out motion-reduce:transition-none ${
                      isOpen ? 'visible opacity-100' : 'invisible opacity-0'
                    }`}
                  >
                    <div className="px-5 pb-5 pt-0 md:px-6 md:pb-6">
                      <p className="max-w-[68ch] text-prose text-base md:text-lg leading-[1.7] text-pretty">
                        {item.answer}
                      </p>
                      {item.cta && (
                        <a
                          href={item.cta.href}
                          className="btn-ghost mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-base font-body no-underline"
                        >
                          {item.cta.label}
                          <span aria-hidden="true">&rarr;</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <p className="mt-8 md:mt-10 text-center text-prose text-base md:text-lg leading-[1.7]">
          Staat je vraag er niet bij? Mail{' '}
          <a
            href="mailto:Theqingzakelijk@gmail.com"
            className="rounded text-gold-light underline underline-offset-4 decoration-gold/40 transition-colors duration-200 hover:text-white hover:decoration-white/60 active:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2 motion-reduce:transition-none"
          >
            Theqingzakelijk@gmail.com
          </a>
          . We reageren doorgaans binnen 24 uur.
        </p>
      </div>
    </section>
  );
}
