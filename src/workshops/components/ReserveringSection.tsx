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
  STAP_VELDEN,
  barTijdvenster,
  bouwBericht,
  bouwMailtoHref,
  foutenVanStap,
  maakContext,
  valideerReservering,
  type Arrangement,
  type ReserveringForm,
  type Stap,
  type Waar,
} from '../lib/reservering';

const veldClass =
  'w-full rounded-lg bg-surface border border-white/15 px-3 py-2 text-sm md:px-3.5 md:py-2.5 md:text-base text-white placeholder:text-muted/60 transition-colors duration-200 hover:border-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:-outline-offset-1 motion-reduce:transition-none';
const labelClass = 'block text-sm md:text-base text-prose mb-1.5';
const foutClass = 'mt-1 text-xs md:text-sm text-red-300/90';
const hintClass = 'mt-1 block text-xs md:text-sm text-muted';
const knopClass =
  'rounded-full px-5 py-2.5 text-sm md:text-base border border-white/20 text-white transition-colors duration-200 hover:border-gold-light active:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2 motion-reduce:transition-none';
const primairKnopClass =
  'btn-primary rounded-full px-6 py-2.5 text-sm md:text-base font-body font-semibold disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2';

const VELD_LABELS: Record<keyof ReserveringForm, string> = {
  naam: 'naam',
  email: 'e-mailadres',
  telefoon: 'telefoonnummer',
  waar: 'plek',
  personen: 'aantal personen',
  arrangement: 'arrangement',
  plaats: 'plaats',
  adres: 'adres',
  datum: 'datum',
  tijd: 'begintijd',
  bericht: 'bericht',
};

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

  const stapFouten = foutenVanStap(fouten, stap);
  const stapCompleet = Object.keys(stapFouten).length === 0;
  const ontbreekt = STAP_VELDEN[stap]
    .filter((veld) => stapFouten[veld] !== undefined)
    .map((veld) => VELD_LABELS[veld]);

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

  function kiesWaar(waar: Waar) {
    // The time rules differ per location, so a start time that was valid in the
    // bar may not be valid on location and vice versa — clear it rather than
    // leave a silently wrong value behind.
    setForm((f) => ({ ...f, waar, arrangement: waar === 'bar' ? f.arrangement : null, tijd: '' }));
    setAangeraakt((s) => {
      const next = new Set(s);
      next.delete('tijd');
      return next;
    });
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
          <p className="uppercase tracking-[0.3em] text-gold-light text-sm mb-2">Reserveren</p>
          <h2 className="font-heading text-2xl md:text-4xl tracking-[-0.02em] mb-2 md:mb-3 text-balance">
            Reserveer een workshop
          </h2>
          <p className="text-prose text-sm md:text-base leading-[1.6] text-pretty">
            Twee stapjes, dan staat je aanvraag klaar in een mailtje. Je hoeft alleen nog op verzenden
            te drukken.
          </p>
        </div>

        <div className="rounded-2xl bg-surface-elevated border border-white/8 p-4 md:p-7 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)]">
          {verstuurd ? (
            <Bevestiging naam={form.naam.trim()} gekopieerd={gekopieerd} onKopieer={kopieer} onOpnieuw={opnieuw} />
          ) : (
            <>
              <StapBalk stap={stap} />

              {stap === 1 ? (
                <>
                  {/* Two columns so every choice card is the same width: the left
                      column holds the choices and the calendar, the right column
                      the typed fields. */}
                  <div className="grid md:grid-cols-2 gap-4 md:gap-5">
                    <div className="flex flex-col gap-4">
                      <fieldset className="border-0 p-0 m-0">
                        <legend className={labelClass}>Waar wil je de workshop?</legend>
                        <div className="grid grid-cols-2 gap-2 md:gap-3">
                          {(['bar', 'locatie'] as const).map((waar) => (
                            <KeuzeKaart
                              key={waar}
                              gekozen={form.waar === waar}
                              titel={waar === 'bar' ? 'In de bar' : 'Op locatie'}
                              onder={`Vanaf ${MIN_PERSONEN[waar]} pers.`}
                              onClick={() => kiesWaar(waar)}
                            />
                          ))}
                        </div>
                      </fieldset>

                      {/* Arrangement (alleen in de bar) — op locatie regel je het eten zelf. */}
                      {form.waar === 'bar' && (
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
                      )}

                      {/* Adres (alleen op locatie) */}
                      {form.waar === 'locatie' && (
                        <div className="grid grid-cols-2 gap-2 md:gap-3">
                          <label className="block">
                            <span className={labelClass}>Plaats</span>
                            <input
                              type="text"
                              value={form.plaats}
                              autoComplete="address-level2"
                              onChange={(e) => zet('plaats', e.target.value)}
                              onBlur={() => raakAan('plaats')}
                              aria-invalid={fout('plaats') !== undefined}
                              className={veldClass}
                            />
                            {fout('plaats') && <span className={`block ${foutClass}`}>{fout('plaats')}</span>}
                          </label>
                          <label className="block">
                            <span className={labelClass}>Adres</span>
                            <input
                              type="text"
                              value={form.adres}
                              autoComplete="street-address"
                              onChange={(e) => zet('adres', e.target.value)}
                              onBlur={() => raakAan('adres')}
                              aria-invalid={fout('adres') !== undefined}
                              className={veldClass}
                            />
                            {fout('adres') && <span className={`block ${foutClass}`}>{fout('adres')}</span>}
                          </label>
                        </div>
                      )}

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
                          <p className={`${hintClass} text-gold-light`}>{formatDateLongNL(form.datum)}</p>
                        ) : laadt ? (
                          <p className={hintClass}>Beschikbaarheid laden…</p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                      <label className="block">
                        <span className={labelClass}>Aantal personen</span>
                        <input
                          type="number"
                          min={MIN_PERSONEN[form.waar]}
                          step={1}
                          value={form.personen}
                          inputMode="numeric"
                          onChange={(e) => zet('personen', e.target.value)}
                          onBlur={() => raakAan('personen')}
                          aria-invalid={fout('personen') !== undefined}
                          aria-describedby="personen-hint"
                          className={`[color-scheme:dark] ${veldClass}`}
                        />
                        <span id="personen-hint" className={fout('personen') !== undefined ? `block ${foutClass}` : hintClass}>
                          {form.waar === 'bar'
                            ? `In de bar starten we vanaf ${MIN_PERSONEN.bar} personen.`
                            : `Op locatie werken we vanaf ${MIN_PERSONEN.locatie} personen.`}
                        </span>
                      </label>

                      <label className="block">
                        <span className={labelClass}>Begintijd</span>
                        <input
                          type="time"
                          value={form.tijd}
                          onChange={(e) => {
                            zet('tijd', e.target.value);
                            raakAan('tijd');
                          }}
                          aria-invalid={fout('tijd') !== undefined}
                          aria-describedby="tijd-hint"
                          className={`[color-scheme:dark] ${veldClass}`}
                        />
                        <span id="tijd-hint" className={fout('tijd') !== undefined ? `block ${foutClass}` : hintClass}>
                          {fout('tijd') ??
                            (form.waar === 'locatie'
                              ? 'Op locatie kies je de tijd zelf.'
                              : venster
                                ? `Starten kan tussen ${venster.start} en ${venster.eind}.`
                                : 'Kies eerst een datum.')}
                        </span>
                      </label>

                      <label className="flex flex-col flex-1">
                        <span className={labelClass}>Bericht (optioneel)</span>
                        <textarea
                          rows={3}
                          value={form.bericht}
                          placeholder="Bijvoorbeeld: twee gasten drinken geen alcohol."
                          onChange={(e) => zet('bericht', e.target.value)}
                          className={`flex-1 resize-none ${veldClass}`}
                        />
                      </label>
                    </div>
                  </div>

                  <StapVoet
                    hint={stapCompleet ? null : `Nog niet compleet: ${ontbreekt.join(', ')}.`}
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
                        : `Nog niet compleet: ${ontbreekt.join(', ')}.`
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
      </div>
    </section>
  );
}

function StapBalk({ stap }: { stap: Stap }) {
  const stappen: { nummer: Stap; label: string }[] = [
    { nummer: 1, label: 'De workshop' },
    { nummer: 2, label: 'Jouw gegevens' },
  ];

  return (
    <div className="flex items-center gap-3 mb-5 md:mb-6" aria-label={`Stap ${stap} van 2`}>
      {stappen.map(({ nummer, label }) => {
        const actief = stap === nummer;
        const gedaan = stap > nummer;
        return (
          <div key={nummer} className="flex flex-1 flex-col gap-1.5">
            <span
              className={`h-[3px] rounded-full transition-colors duration-300 motion-reduce:transition-none ${
                actief || gedaan ? 'bg-gold' : 'bg-white/12'
              }`}
            />
            <span className={`text-xs md:text-sm ${actief ? 'text-gold-light' : 'text-muted'}`}>
              {nummer}. {label}
            </span>
          </div>
        );
      })}
    </div>
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
        <p aria-live="polite" className="text-xs md:text-sm text-muted leading-[1.6]">
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
    form.tijd !== '' ? `vanaf ${form.tijd}` : null,
  ].filter((d): d is string => Boolean(d));

  return (
    <p className="mt-4 rounded-lg border border-white/8 bg-surface px-3.5 py-2.5 text-xs md:text-sm text-muted leading-[1.6]">
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
      className={`rounded-lg border px-3 py-2.5 text-left transition-colors duration-200 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2 ${
        gekozen
          ? 'border-gold bg-gold/10 shadow-[0_8px_24px_-14px_rgba(200,146,42,0.8)]'
          : 'border-white/12 bg-surface hover:border-white/30'
      }`}
    >
      <span className={`block font-heading text-sm md:text-lg leading-tight ${gekozen ? 'text-gold-light' : 'text-white'}`}>
        {titel}
      </span>
      <span className="block text-xs md:text-sm text-muted mt-0.5">{onder}</span>
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
      <h3 className="font-heading text-xl md:text-3xl text-gold-light mb-2.5">Je mailprogramma is geopend</h3>
      <p className="text-prose text-sm md:text-base leading-[1.6] max-w-md mx-auto">
        {naam === '' ? 'De aanvraag staat klaar' : `Bedankt ${naam}, je aanvraag staat klaar`} in een mailtje.
        Druk daar nog op <span className="text-white">verzenden</span> — dan is hij bij ons.
      </p>
      <p className="text-muted text-xs md:text-sm leading-[1.6] max-w-md mx-auto mt-3">
        Ging je mailprogramma niet open? Kopieer de aanvraag en mail hem naar{' '}
        <a
          href={`mailto:${RESERVERING_EMAIL}`}
          className="rounded text-gold-light underline underline-offset-4 decoration-gold/40 transition-colors duration-200 hover:text-white hover:decoration-white/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2 motion-reduce:transition-none"
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
          className="rounded-full px-5 py-2.5 text-sm md:text-base text-muted transition-colors duration-200 hover:text-white active:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2 motion-reduce:transition-none"
        >
          Nieuwe aanvraag
        </button>
      </div>
    </div>
  );
}
