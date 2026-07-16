import { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar } from '../../shared/components/Calendar';
import { fetchAvailabilityContext, fetchServiceSettings } from '../../shared/lib/data';
import type { AvailabilityContext } from '../../shared/lib/availability';
import { formatDateLongNL } from '../../shared/lib/format';
import {
  ARRANGEMENTEN,
  FALLBACK_CONTEXT,
  LEGE_RESERVERING,
  MIN_PERSONEN,
  RESERVERING_EMAIL,
  barTijdvenster,
  bouwBericht,
  bouwMailtoHref,
  foutenVanStap,
  maakContext,
  normaliseerTijd,
  valideerReservering,
  type Arrangement,
  type ReserveringForm,
  type Stap,
} from '../lib/reservering';

const veldClass =
  'w-full rounded-lg bg-surface border border-white px-3 py-2 text-sm md:px-3.5 md:py-2.5 md:text-base text-white placeholder:text-white/70 transition-colors duration-200 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:-outline-offset-1 motion-reduce:transition-none';
const labelClass = 'block text-sm md:text-base text-white mb-1.5';
const foutClass = 'mt-1 text-xs md:text-sm text-red-300';
const hintClass = 'mt-1 block text-xs md:text-sm text-white';
const knopClass =
  'rounded-full px-5 py-2.5 text-sm md:text-base border border-white text-white transition-colors duration-200 hover:bg-white/10 active:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 motion-reduce:transition-none';
const primairKnopClass =
  'btn-primary rounded-full px-6 py-2.5 text-sm md:text-base font-body font-semibold disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2';

export function ReserveringSection() {
  const [stap, setStap] = useState<Stap>(1);
  const [form, setForm] = useState<ReserveringForm>(LEGE_RESERVERING);
  const [aangeraakt, setAangeraakt] = useState<Set<keyof ReserveringForm>>(new Set());
  const [ctx, setCtx] = useState<AvailabilityContext | null>(null);
  const [laadt, setLaadt] = useState(true);
  const [verstuurd, setVerstuurd] = useState(false);
  const [gekopieerd, setGekopieerd] = useState(false);
  const kopieerTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    let afgebroken = false;
    Promise.all([fetchAvailabilityContext(), fetchServiceSettings().catch(() => null)])
      .then(([data, settings]) => {
        if (!afgebroken) setCtx(maakContext(data, settings));
      })
      .catch((err) => {
        // Leave ctx null: the form falls back to "any day, three days out" so a
        // guest can still send a request while the database is unreachable.
        console.error('Beschikbaarheid laden mislukt', err);
      })
      .finally(() => {
        if (!afgebroken) setLaadt(false);
      });
    return () => {
      afgebroken = true;
    };
  }, []);

  useEffect(() => () => window.clearTimeout(kopieerTimer.current), []);

  // While loading we have no rules yet, so advancing is blocked either way.
  const actieveCtx = laadt ? null : (ctx ?? FALLBACK_CONTEXT);
  const fouten = useMemo(() => valideerReservering(form, actieveCtx), [form, actieveCtx]);
  const venster = form.waar === 'bar' ? barTijdvenster(form.datum, actieveCtx?.availability ?? null) : null;

  const stapCompleet = Object.keys(foutenVanStap(fouten, stap)).length === 0;

  /** The rule for the start time lives in the field itself, as its placeholder. */
  const tijdPlaceholder =
    form.waar === 'locatie' || venster === null
      ? 'Bijv. 19:00'
      : venster.start === '00:00'
        ? `Uiterlijk ${venster.eind}`
        : `Tussen ${venster.start} en ${venster.eind}`;

  function zet<K extends keyof ReserveringForm>(veld: K, waarde: ReserveringForm[K]) {
    setForm((f) => ({ ...f, [veld]: waarde }));
  }

  function raakAan(veld: keyof ReserveringForm) {
    setAangeraakt((s) => new Set(s).add(veld));
  }

  /** Errors stay quiet until the guest has left the field — no red text on a form they haven't filled in yet. */
  function fout(veld: keyof ReserveringForm): string | undefined {
    return aangeraakt.has(veld) ? fouten[veld] : undefined;
  }

  function verstuur() {
    if (!stapCompleet || stap !== 2) return;
    window.location.href = bouwMailtoHref(form);
    setVerstuurd(true);
  }

  async function kopieer() {
    try {
      await navigator.clipboard.writeText(bouwBericht(form));
      setGekopieerd(true);
      kopieerTimer.current = window.setTimeout(() => setGekopieerd(false), 2500);
    } catch {
      setGekopieerd(false);
    }
  }

  function opnieuw() {
    setForm(LEGE_RESERVERING);
    setAangeraakt(new Set());
    setStap(1);
    setVerstuurd(false);
  }

  return (
    <section id="reserveren" className="py-10 md:py-20 px-6 md:px-10 scroll-mt-24">
      <div className="max-w-3xl mx-auto">
        <div className="max-w-xl mx-auto flex flex-col items-center text-center mb-6 md:mb-9">
          <p className="uppercase tracking-[0.3em] text-white text-sm mb-2">Reserveren</p>
          <h2 className="font-heading text-2xl md:text-4xl tracking-[-0.02em] mb-2 md:mb-3 text-balance">
            Reserveer een workshop
          </h2>
          <p className="text-white text-sm md:text-base leading-[1.6] text-pretty">
            Twee stapjes, dan staat je aanvraag klaar in een mailtje. Je hoeft alleen nog op verzenden
            te drukken.
          </p>
        </div>

        <div className="rounded-2xl bg-surface border border-white p-4 md:p-7">
          {verstuurd ? (
            <Bevestiging naam={form.naam.trim()} gekopieerd={gekopieerd} onKopieer={kopieer} onOpnieuw={opnieuw} />
          ) : (
            <>
              {stap === 1 ? (
                <>
                  {/* Two columns so every choice card is the same width: the left
                      column holds the choices and the calendar, the right column
                      the typed fields. */}
                  <div className="grid md:grid-cols-2 gap-4 md:gap-5">
                    <div className="flex flex-col gap-4">
                      <fieldset className="border-0 p-0 m-0">
                        <legend className={labelClass}>Arrangement</legend>
                        <div className="grid grid-cols-2 gap-2 md:gap-3">
                          {(Object.keys(ARRANGEMENTEN) as Arrangement[]).map((naam) => (
                            <KeuzeKaart
                              key={naam}
                              gekozen={form.arrangement === naam}
                              titel={naam}
                              onder={ARRANGEMENTEN[naam]}
                              onClick={() => {
                                zet('arrangement', naam);
                                raakAan('arrangement');
                              }}
                            />
                          ))}
                        </div>
                        {fout('arrangement') && <p className={foutClass}>{fout('arrangement')}</p>}
                      </fieldset>

                      <div>
                        <span className={labelClass}>Datum</span>

                        <div className="hidden md:block">
                          <Calendar
                            value={form.datum}
                            onChange={(v) => {
                              zet('datum', v);
                              raakAan('datum');
                            }}
                            ctx={actieveCtx}
                            compact
                            wit
                          />
                        </div>

                        {/* Picking a date is a deliberate, finished choice — unlike typing a
                            name, there is no half-entered state to protect, so an unavailable
                            day says so at once instead of waiting for blur. */}
                        <input
                          type="date"
                          value={form.datum}
                          onChange={(e) => {
                            zet('datum', e.target.value);
                            raakAan('datum');
                          }}
                          aria-invalid={fout('datum') !== undefined}
                          className={`md:hidden [color-scheme:dark] ${veldClass}`}
                        />

                        {fout('datum') ? (
                          <p className={foutClass}>{fout('datum')}</p>
                        ) : form.datum !== '' ? (
                          <p className={hintClass}>{formatDateLongNL(form.datum)}</p>
                        ) : laadt ? (
                          <p className={hintClass}>Beschikbaarheid laden…</p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                      {/* The minimum and the start-time window are the placeholders:
                          the rule sits in the box the guest is about to fill in.
                          A screen reader gets the same sentence from the hidden
                          description, since a placeholder alone is not a label. */}
                      <label className="block">
                        <span className={labelClass}>Aantal personen</span>
                        <input
                          type="number"
                          min={MIN_PERSONEN[form.waar]}
                          step={1}
                          value={form.personen}
                          inputMode="numeric"
                          placeholder={`Vanaf ${MIN_PERSONEN[form.waar]} personen`}
                          onChange={(e) => zet('personen', e.target.value)}
                          onBlur={() => raakAan('personen')}
                          aria-invalid={fout('personen') !== undefined}
                          aria-describedby="personen-hint"
                          className={`[color-scheme:dark] ${veldClass}`}
                        />
                        <span id="personen-hint" className="sr-only">
                          {form.waar === 'bar'
                            ? `In de bar starten we vanaf ${MIN_PERSONEN.bar} personen.`
                            : `Op locatie werken we vanaf ${MIN_PERSONEN.locatie} personen.`}
                        </span>
                        {fout('personen') && <span className={`block ${foutClass}`}>{fout('personen')}</span>}
                      </label>

                      <label className="block">
                        <span className={labelClass}>Begintijd</span>
                        <input
                          type="text"
                          value={form.tijd}
                          inputMode="numeric"
                          maxLength={5}
                          autoComplete="off"
                          placeholder={tijdPlaceholder}
                          onChange={(e) => zet('tijd', e.target.value)}
                          onBlur={() => {
                            // '1900' and '19.00' are what people actually type; tidy
                            // the field up once they leave it rather than fight them
                            // while they are still typing.
                            const genormaliseerd = normaliseerTijd(form.tijd);
                            if (genormaliseerd !== null) zet('tijd', genormaliseerd);
                            raakAan('tijd');
                          }}
                          aria-invalid={fout('tijd') !== undefined}
                          aria-describedby="tijd-hint"
                          className={veldClass}
                        />
                        <span id="tijd-hint" className="sr-only">
                          {form.waar === 'locatie'
                            ? 'Op locatie kies je de begintijd zelf, bijvoorbeeld 19:00.'
                            : venster
                              ? `Starten kan tussen ${venster.start} en ${venster.eind}.`
                              : 'Kies eerst een datum.'}
                        </span>
                        {fout('tijd') && <span className={`block ${foutClass}`}>{fout('tijd')}</span>}
                      </label>

                      {/* Grows to the height of the calendar next to it, so both
                          columns end on the same line. */}
                      <label className="flex flex-col flex-1">
                        <span className={labelClass}>Bericht (optioneel)</span>
                        <textarea
                          rows={4}
                          value={form.bericht}
                          placeholder="Bijvoorbeeld: twee gasten drinken geen alcohol."
                          onChange={(e) => zet('bericht', e.target.value)}
                          className={`flex-1 resize-none ${veldClass}`}
                        />
                      </label>
                    </div>
                  </div>

                  <StapVoet
                    hint={null}
                    rechts={
                      <button type="button" disabled={!stapCompleet} onClick={() => setStap(2)} className={primairKnopClass}>
                        Volgende
                      </button>
                    }
                  />
                </>
              ) : (
                <>
                  <div className="grid md:grid-cols-2 gap-4 md:gap-5">
                    <label className="block">
                      <span className={labelClass}>Naam</span>
                      <input
                        type="text"
                        value={form.naam}
                        autoComplete="name"
                        onChange={(e) => zet('naam', e.target.value)}
                        onBlur={() => raakAan('naam')}
                        aria-invalid={fout('naam') !== undefined}
                        className={veldClass}
                      />
                      {fout('naam') && <span className={`block ${foutClass}`}>{fout('naam')}</span>}
                    </label>

                    <label className="block">
                      <span className={labelClass}>E-mailadres</span>
                      <input
                        type="email"
                        value={form.email}
                        autoComplete="email"
                        inputMode="email"
                        onChange={(e) => zet('email', e.target.value)}
                        onBlur={() => raakAan('email')}
                        aria-invalid={fout('email') !== undefined}
                        className={veldClass}
                      />
                      {fout('email') && <span className={`block ${foutClass}`}>{fout('email')}</span>}
                    </label>

                    <label className="block md:col-span-2 md:max-w-[50%] md:pr-2.5">
                      <span className={labelClass}>Telefoonnummer</span>
                      <input
                        type="tel"
                        value={form.telefoon}
                        autoComplete="tel"
                        inputMode="tel"
                        onChange={(e) => zet('telefoon', e.target.value)}
                        onBlur={() => raakAan('telefoon')}
                        aria-invalid={fout('telefoon') !== undefined}
                        className={veldClass}
                      />
                      {fout('telefoon') && <span className={`block ${foutClass}`}>{fout('telefoon')}</span>}
                    </label>
                  </div>

                  <Samenvatting form={form} />

                  <StapVoet
                    hint={
                      stapCompleet
                        ? 'Je mailprogramma opent met de aanvraag erin. Daar druk je nog op verzenden.'
                        : null
                    }
                    links={
                      <button type="button" onClick={() => setStap(1)} className={knopClass}>
                        Terug
                      </button>
                    }
                    rechts={
                      <button type="button" disabled={!stapCompleet} onClick={verstuur} className={primairKnopClass}>
                        Verstuur aanvraag
                      </button>
                    }
                  />
                </>
              )}
            </>
          )}
        </div>

        <p className="mt-4 md:mt-5 text-center text-sm md:text-base text-white/80 leading-[1.6]">
          Op locatie, vanaf 15 personen?{' '}
          <a
            href="/locatie/#offerte"
            className="rounded text-white underline underline-offset-4 decoration-white/60 transition-colors duration-200 hover:decoration-white active:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 motion-reduce:transition-none"
          >
            Vraag een offerte aan &rarr;
          </a>
        </p>
      </div>
    </section>
  );
}

function StapVoet({
  hint,
  links,
  rechts,
}: {
  hint: string | null;
  links?: React.ReactNode;
  rechts: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 mt-5 md:mt-6">
      <div className="flex items-center gap-3">
        {links}
        {rechts}
      </div>
      {hint && (
        <p aria-live="polite" className="text-xs md:text-sm text-white leading-[1.6]">
          {hint}
        </p>
      )}
    </div>
  );
}

/** Reminds the guest on step 2 what they picked on step 1, so "Terug" is a
 *  choice rather than the only way to check. */
function Samenvatting({ form }: { form: ReserveringForm }) {
  const delen = [
    form.waar === 'bar' ? 'In de bar' : `Op locatie in ${form.plaats.trim()}`,
    `${form.personen} personen`,
    form.arrangement,
    form.datum !== '' ? formatDateLongNL(form.datum) : null,
    form.tijd !== '' ? `vanaf ${normaliseerTijd(form.tijd) ?? form.tijd.trim()}` : null,
  ].filter((d): d is string => Boolean(d));

  return (
    <p className="mt-4 rounded-lg border border-white bg-surface px-3.5 py-2.5 text-xs md:text-sm text-white leading-[1.6]">
      {delen.join(' · ')}
    </p>
  );
}

interface KeuzeKaartProps {
  gekozen: boolean;
  titel: string;
  onder: string;
  onClick: () => void;
}

function KeuzeKaart({ gekozen, titel, onder, onClick }: KeuzeKaartProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={gekozen}
      className={`rounded-lg border bg-surface px-3 py-2.5 text-left transition-colors duration-200 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 ${
        gekozen ? 'border-gold' : 'border-white hover:bg-white/5'
      }`}
    >
      <span className={`block font-heading text-sm md:text-lg leading-tight ${gekozen ? 'text-gold-light' : 'text-white'}`}>
        {titel}
      </span>
      <span className={`block text-xs md:text-sm mt-0.5 ${gekozen ? 'text-gold-light/80' : 'text-white'}`}>{onder}</span>
    </button>
  );
}

interface BevestigingProps {
  naam: string;
  gekopieerd: boolean;
  onKopieer: () => void;
  onOpnieuw: () => void;
}

function Bevestiging({ naam, gekopieerd, onKopieer, onOpnieuw }: BevestigingProps) {
  return (
    <div className="text-center py-4 md:py-6" role="status">
      <h3 className="font-heading text-xl md:text-3xl text-white mb-2.5">Je mailprogramma is geopend</h3>
      <p className="text-white text-sm md:text-base leading-[1.6] max-w-md mx-auto">
        {naam === '' ? 'De aanvraag staat klaar' : `Bedankt ${naam}, je aanvraag staat klaar`} in een mailtje.
        Druk daar nog op <span className="font-semibold">verzenden</span> — dan is hij bij ons.
      </p>
      <p className="text-white text-xs md:text-sm leading-[1.6] max-w-md mx-auto mt-3">
        Ging je mailprogramma niet open? Kopieer de aanvraag en mail hem naar{' '}
        <a
          href={`mailto:${RESERVERING_EMAIL}`}
          className="rounded text-white underline underline-offset-4 decoration-white/60 transition-colors duration-200 hover:decoration-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 motion-reduce:transition-none"
        >
          {RESERVERING_EMAIL}
        </a>
        .
      </p>

      <div className="flex flex-col sm:flex-row gap-2.5 justify-center mt-5">
        <button type="button" onClick={onKopieer} className={knopClass}>
          {gekopieerd ? 'Gekopieerd' : 'Kopieer aanvraag als tekst'}
        </button>
        <button
          type="button"
          onClick={onOpnieuw}
          className="rounded-full px-5 py-2.5 text-sm md:text-base text-white transition-colors duration-200 hover:bg-white/10 active:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 motion-reduce:transition-none"
        >
          Nieuwe aanvraag
        </button>
      </div>
    </div>
  );
}
