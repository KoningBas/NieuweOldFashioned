import type { Availability, BlockedDate, ServiceSettings } from '../../shared/types/db';
import type { AvailabilityContext, ConfirmedRequestLike } from '../../shared/lib/availability';
import { isDateSelectable } from '../../shared/lib/availability';
import { formatDateLongNL, parseDateOnly } from '../../shared/lib/format';

export type Waar = 'bar' | 'locatie';
export type Arrangement = 'Bites' | 'Streetfood';

export const RESERVERING_EMAIL = 'Theqingzakelijk@gmail.com';

/** The FAQ promises guests can book up to three days ahead. A shorter
 *  booking_notice_hours in the admin panel must never undercut that promise,
 *  so the effective notice is the longer of the two. */
export const MIN_NOTICE_HOURS = 72;

/** Workshops in the bar start at 19:00 at the latest. */
export const LAATSTE_STARTTIJD = '19:00';

export const MIN_PERSONEN: Record<Waar, number> = { bar: 4, locatie: 15 };

export const ARRANGEMENTEN: Record<Arrangement, string> = {
  Bites: '€ 32 p.p. — 1,5 tot 2 uur',
  Streetfood: '€ 42 p.p. — 2 tot 2,5 uur',
};

export interface ReserveringForm {
  naam: string;
  email: string;
  telefoon: string;
  waar: Waar;
  /** Raw input, so a half-typed or emptied field stays empty instead of snapping to 0. */
  personen: string;
  arrangement: Arrangement | null;
  plaats: string;
  adres: string;
  /** 'YYYY-MM-DD' */
  datum: string;
  /** 'HH:MM' */
  tijd: string;
  bericht: string;
}

export const LEGE_RESERVERING: ReserveringForm = {
  naam: '',
  email: '',
  telefoon: '',
  waar: 'bar',
  personen: '',
  arrangement: null,
  plaats: '',
  adres: '',
  datum: '',
  tijd: '',
  bericht: '',
};

export type Fouten = Partial<Record<keyof ReserveringForm, string>>;

export type Stap = 1 | 2;

/**
 * Which field belongs to which step. Step 1 is everything about the workshop
 * itself — including the address, which says where the workshop happens, not
 * who is booking it. Step 2 is who to contact about it.
 *
 * The order within each step is the order the fields appear in, so the
 * "nog niet compleet" summary names them the way the guest reads them.
 */
export const STAP_VELDEN: Record<Stap, (keyof ReserveringForm)[]> = {
  1: ['waar', 'personen', 'arrangement', 'plaats', 'adres', 'datum', 'tijd', 'bericht'],
  2: ['naam', 'email', 'telefoon'],
};

/** The subset of `fouten` that the given step is responsible for. */
export function foutenVanStap(fouten: Fouten, stap: Stap): Fouten {
  const eigen: Fouten = {};
  for (const veld of STAP_VELDEN[stap]) {
    if (fouten[veld] !== undefined) eigen[veld] = fouten[veld];
  }
  return eigen;
}

export interface Tijdvenster {
  start: string;
  eind: string;
}

function naarMinuten(hhmm: string): number {
  const [uur, minuut] = hhmm.split(':').map(Number);
  return uur * 60 + minuut;
}

/**
 * Builds the availability context the calendar and the date check run on.
 *
 * `settings` is null when the settings row could not be fetched; the fixed
 * three-day notice still applies in that case.
 */
export function maakContext(
  data: { availability: Availability[]; blockedDates: BlockedDate[]; confirmedRequests: ConfirmedRequestLike[] },
  settings: ServiceSettings | null,
): AvailabilityContext {
  return {
    ...data,
    settings: {
      booking_notice_hours: Math.max(MIN_NOTICE_HOURS, settings?.booking_notice_hours ?? 0),
    },
  };
}

/**
 * Stand-in context for when Supabase cannot be reached.
 *
 * The calendar greys out every day it has no availability row for, so without
 * this a failed fetch would leave the guest with a form they cannot submit.
 * Falling back to "every weekday, three days out" keeps the door open: we would
 * rather receive a request on a day we turn out to be closed than receive none.
 */
export const FALLBACK_CONTEXT: AvailabilityContext = {
  availability: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
    id: `fallback-${weekday}`,
    weekday,
    is_available: true,
    start_time: '00:00',
    end_time: '23:59',
  })),
  blockedDates: [],
  confirmedRequests: [],
  settings: { booking_notice_hours: MIN_NOTICE_HOURS },
};

/**
 * The window of valid start times for a workshop in the bar on `datum`:
 * the bar's opening hours for that weekday, capped at LAATSTE_STARTTIJD.
 *
 * Returns null when that day has no window at all — the bar is closed, or it
 * only opens after the last workshop may start.
 *
 * `availability` is null when Supabase could not be reached. Opening hours are
 * unknown then, so only the 19:00 cap is enforced rather than blocking the
 * guest out of a form they cannot otherwise submit.
 */
export function barTijdvenster(datum: string, availability: Availability[] | null): Tijdvenster | null {
  if (datum === '') return null;
  if (availability === null) return { start: '00:00', eind: LAATSTE_STARTTIJD };

  const weekdag = parseDateOnly(datum).getDay();
  const regel = availability.find((a) => a.weekday === weekdag && a.is_available);
  if (!regel) return null;

  const start = regel.start_time.slice(0, 5);
  const sluit = regel.end_time.slice(0, 5);

  // A closing time at or before opening (e.g. open 18:00, close 01:00) runs
  // past midnight. The 19:00 cap lands well before that, so treat the day as
  // running to end-of-day rather than reading it as a zero-length window.
  const sluitMin = naarMinuten(sluit) <= naarMinuten(start) ? 24 * 60 : naarMinuten(sluit);
  const eindMin = Math.min(sluitMin, naarMinuten(LAATSTE_STARTTIJD));
  if (naarMinuten(start) > eindMin) return null;

  const eind = eindMin === naarMinuten(LAATSTE_STARTTIJD) ? LAATSTE_STARTTIJD : sluit;
  return { start, eind };
}

function datumHaaltTermijn(datum: string, noticeHours: number): boolean {
  const gekozen = parseDateOnly(datum);
  const vroegst = new Date(Date.now() + noticeHours * 60 * 60 * 1000);
  return gekozen.getTime() >= vroegst.getTime();
}

/**
 * Every rule the form enforces, keyed by field. An empty object means the
 * reservation may be sent.
 *
 * `ctx` is null when Supabase could not be reached: the calendar then falls
 * back to "any date at least three days out", so a guest can still reach us
 * instead of staring at a form where every day is greyed out.
 */
export function valideerReservering(form: ReserveringForm, ctx: AvailabilityContext | null): Fouten {
  const fouten: Fouten = {};

  if (form.naam.trim() === '') fouten.naam = 'Vul je naam in.';
  if (!/\S+@\S+\.\S+/.test(form.email.trim())) fouten.email = 'Vul een geldig e-mailadres in.';
  if (form.telefoon.replace(/\D/g, '').length < 8) fouten.telefoon = 'Vul een geldig telefoonnummer in.';

  const minimum = MIN_PERSONEN[form.waar];
  const personen = Number(form.personen);
  if (form.personen.trim() === '' || !Number.isInteger(personen) || personen < minimum) {
    fouten.personen =
      form.waar === 'bar'
        ? `In de bar starten we vanaf ${minimum} personen.`
        : `Op locatie werken we vanaf ${minimum} personen.`;
  }

  if (form.waar === 'bar' && form.arrangement === null) {
    fouten.arrangement = 'Kies Bites of Streetfood.';
  }

  if (form.waar === 'locatie') {
    if (form.plaats.trim() === '') fouten.plaats = 'Vul de plaats in.';
    if (form.adres.trim() === '') fouten.adres = 'Vul het adres in.';
  }

  if (form.datum === '') {
    fouten.datum = 'Kies een datum.';
  } else if (ctx !== null) {
    // Noon, not midnight: a bare 'YYYY-MM-DD' parses as UTC and can land on the
    // previous local day (see the toDateOnly note in shared/lib/availability.ts).
    if (!isDateSelectable(new Date(`${form.datum}T12:00:00`), ctx)) {
      fouten.datum = 'Deze datum is niet beschikbaar. Kies een andere datum.';
    }
  } else if (!datumHaaltTermijn(form.datum, MIN_NOTICE_HOURS)) {
    fouten.datum = 'Reserveer minimaal drie dagen van tevoren.';
  }

  if (form.tijd === '') {
    fouten.tijd = 'Kies een begintijd.';
  } else if (form.waar === 'bar' && fouten.datum === undefined) {
    // On location the guest picks the time freely — we come to them.
    const venster = barTijdvenster(form.datum, ctx?.availability ?? null);
    if (venster === null) {
      fouten.tijd = 'Op deze dag zijn er geen workshops in de bar mogelijk. Kies een andere datum.';
    } else if (naarMinuten(form.tijd) < naarMinuten(venster.start) || naarMinuten(form.tijd) > naarMinuten(venster.eind)) {
      // With the opening hours unknown (Supabase unreachable) the window starts
      // at midnight, and "tussen 00:00 en 19:00" reads as nonsense to a guest —
      // only the cap is worth stating there.
      fouten.tijd =
        venster.start === '00:00'
          ? `Workshops in de bar starten uiterlijk om ${venster.eind}.`
          : `Workshops in de bar starten tussen ${venster.start} en ${venster.eind}.`;
    }
  }

  return fouten;
}

function waarLabel(form: ReserveringForm): string {
  return form.waar === 'bar' ? 'In de bar (Rijssen)' : 'Op locatie';
}

export function bouwOnderwerp(form: ReserveringForm): string {
  const naam = form.naam.trim() || 'onbekend';
  const datum = form.datum === '' ? 'datum onbekend' : formatDateLongNL(form.datum);
  return `Workshopreservering – ${naam} – ${datum}`;
}

export function bouwBericht(form: ReserveringForm): string {
  const regels: string[] = [
    'Hallo,',
    '',
    'Ik wil graag een cocktailworkshop reserveren.',
    '',
    `Naam: ${form.naam.trim()}`,
    `E-mailadres: ${form.email.trim()}`,
    `Telefoonnummer: ${form.telefoon.trim()}`,
    '',
    `Workshop: ${waarLabel(form)}`,
  ];

  if (form.waar === 'bar' && form.arrangement !== null) {
    regels.push(`Arrangement: ${form.arrangement} (${ARRANGEMENTEN[form.arrangement]})`);
  }
  if (form.waar === 'locatie') {
    regels.push(`Adres: ${form.adres.trim()}, ${form.plaats.trim()}`);
  }

  regels.push(
    `Aantal personen: ${form.personen.trim()}`,
    `Datum: ${form.datum === '' ? '-' : formatDateLongNL(form.datum)}`,
    `Begintijd: ${form.tijd}`,
  );

  if (form.bericht.trim() !== '') {
    regels.push('', 'Bericht:', form.bericht.trim());
  }

  regels.push('', 'Graag hoor ik of dit lukt.', '', `Met vriendelijke groet,`, form.naam.trim());

  return regels.join('\r\n');
}

export function bouwMailtoHref(form: ReserveringForm): string {
  const onderwerp = encodeURIComponent(bouwOnderwerp(form));
  const bericht = encodeURIComponent(bouwBericht(form));
  return `mailto:${RESERVERING_EMAIL}?subject=${onderwerp}&body=${bericht}`;
}
