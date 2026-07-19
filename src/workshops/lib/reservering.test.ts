import { afterEach, describe, it, expect, vi } from 'vitest';
import type { Availability } from '../../shared/types/db';
import type { AvailabilityContext } from '../../shared/lib/availability';
import {
  LEGE_RESERVERING,
  barTijdvenster,
  bouwBericht,
  bouwMailtoHref,
  bouwOnderwerp,
  foutenVanStap,
  maakContext,
  normaliseerTijd,
  bouwQuoteRequest,
  valideerReservering,
  type ReserveringForm,
  type WorkshopPakket,
} from './reservering';

// A Saturday well past any notice window, used as the happy-path date throughout.
const NU = new Date('2026-07-01T12:00:00'); // Wednesday
const ZATERDAG = '2026-07-11';

const availability: Availability[] = [
  { id: 'a0', weekday: 0, is_available: false, start_time: '18:00', end_time: '23:00' },
  { id: 'a5', weekday: 5, is_available: true, start_time: '16:00', end_time: '01:00' }, // Friday, past midnight
  { id: 'a6', weekday: 6, is_available: true, start_time: '15:00', end_time: '23:00' }, // Saturday
];

const ctx: AvailabilityContext = maakContext(
  { availability, blockedDates: [], confirmedRequests: [] },
  null,
);

function form(overrides: Partial<ReserveringForm> = {}): ReserveringForm {
  return {
    ...LEGE_RESERVERING,
    naam: 'Jan Jansen',
    email: 'jan@example.com',
    telefoon: '0612345678',
    waar: 'bar',
    personen: '6',
    arrangement: 'Bites',
    datum: ZATERDAG,
    tijd: '18:00',
    ...overrides,
  };
}

describe('normaliseerTijd', () => {
  it.each([
    ['19:00', '19:00'],
    ['1900', '19:00'],
    ['19.00', '19:00'],
    ['19u00', '19:00'],
    ['19 uur', '19:00'],
    ['19', '19:00'],
    ['7', '07:00'],
    ['930', '09:30'],
    [' 09:05 ', '09:05'],
    ['0000', '00:00'],
  ])('reads %j as %j', (invoer, verwacht) => {
    expect(normaliseerTijd(invoer)).toBe(verwacht);
  });

  it.each([
    [''],
    ['half acht'],
    ['24:00'],
    ['1961'], // 61 minutes
    ['12345'],
  ])('rejects %j', (invoer) => {
    expect(normaliseerTijd(invoer)).toBeNull();
  });
});

describe('valideerReservering', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function freeze() {
    vi.useFakeTimers();
    vi.setSystemTime(NU);
  }

  it('accepts a complete reservation in the bar', () => {
    freeze();
    expect(valideerReservering(form(), ctx)).toEqual({});
  });

  it('accepts a complete reservation on location', () => {
    freeze();
    const onLocation = form({
      waar: 'locatie',
      personen: '20',
      arrangement: null,
      plaats: 'Rijssen',
      adres: 'Grotestraat 12',
      tijd: '21:30', // past the 19:00 bar cap — on location the time is free
    });
    expect(valideerReservering(onLocation, ctx)).toEqual({});
  });

  it('rejects fewer than 4 guests in the bar', () => {
    freeze();
    expect(valideerReservering(form({ personen: '3' }), ctx).personen).toBe(
      'In de bar starten we vanaf 4 personen.',
    );
  });

  it('rejects fewer than 15 guests on location', () => {
    freeze();
    const onLocation = form({ waar: 'locatie', personen: '10', arrangement: null, plaats: 'Rijssen', adres: 'Grotestraat 12' });
    expect(valideerReservering(onLocation, ctx).personen).toBe('Op locatie werken we vanaf 15 personen.');
  });

  it('requires an arrangement in the bar but not on location', () => {
    freeze();
    expect(valideerReservering(form({ arrangement: null }), ctx).arrangement).toBe('Kies Bites of Streetfood.');

    const onLocation = form({ waar: 'locatie', personen: '20', arrangement: null, plaats: 'Rijssen', adres: 'Grotestraat 12' });
    expect(valideerReservering(onLocation, ctx).arrangement).toBeUndefined();
  });

  it('requires an address only on location', () => {
    freeze();
    expect(valideerReservering(form(), ctx).adres).toBeUndefined();

    const onLocation = form({ waar: 'locatie', personen: '20', arrangement: null });
    const fouten = valideerReservering(onLocation, ctx);
    expect(fouten.plaats).toBe('Vul de plaats in.');
    expect(fouten.adres).toBe('Vul het adres in.');
  });

  it('rejects a start time after 19:00 in the bar', () => {
    freeze();
    expect(valideerReservering(form({ tijd: '20:00' }), ctx).tijd).toBe(
      'Workshops in de bar starten tussen 15:00 en 19:00.',
    );
  });

  it('rejects a start time before the bar opens', () => {
    freeze();
    expect(valideerReservering(form({ tijd: '14:00' }), ctx).tijd).toBe(
      'Workshops in de bar starten tussen 15:00 en 19:00.',
    );
  });

  it('accepts a start time the guest typed without a colon', () => {
    freeze();
    expect(valideerReservering(form({ tijd: '1800' }), ctx).tijd).toBeUndefined();
  });

  it('rejects text that is not a time', () => {
    freeze();
    expect(valideerReservering(form({ tijd: 'half acht' }), ctx).tijd).toBe(
      'Vul een tijd in zoals 19:00.',
    );
  });

  it('rejects a date on a closed weekday', () => {
    freeze();
    const sunday = '2026-07-12';
    expect(valideerReservering(form({ datum: sunday }), ctx).datum).toBe(
      'Deze datum is niet beschikbaar. Kies een andere datum.',
    );
  });

  it('rejects a date inside the three-day notice window', () => {
    freeze();
    const overmorgen = '2026-07-03'; // Friday, two days out
    expect(valideerReservering(form({ datum: overmorgen, tijd: '17:00' }), ctx).datum).toBe(
      'Deze datum is niet beschikbaar. Kies een andere datum.',
    );
  });

  it('honours a longer admin notice window than the three-day floor', () => {
    freeze();
    const strict = maakContext(
      { availability, blockedDates: [], confirmedRequests: [] },
      // Only booking_notice_hours is read; the rest of the row is irrelevant here.
      { booking_notice_hours: 24 * 14 } as never,
    );
    expect(valideerReservering(form(), strict).datum).toBe(
      'Deze datum is niet beschikbaar. Kies een andere datum.',
    );
  });

  it('rejects an invalid email and a too-short phone number', () => {
    freeze();
    const fouten = valideerReservering(form({ email: 'jan@', telefoon: '06123' }), ctx);
    expect(fouten.email).toBe('Vul een geldig e-mailadres in.');
    expect(fouten.telefoon).toBe('Vul een geldig telefoonnummer in.');
  });

  describe('when Supabase is unreachable (ctx = null)', () => {
    it('still accepts a date at least three days out', () => {
      freeze();
      expect(valideerReservering(form(), null)).toEqual({});
    });

    it('still rejects a date inside the three-day window', () => {
      freeze();
      expect(valideerReservering(form({ datum: '2026-07-02' }), null).datum).toBe(
        'Reserveer minimaal drie dagen van tevoren.',
      );
    });

    it('still caps the bar start time at 19:00, without quoting a midnight opening hour', () => {
      freeze();
      expect(valideerReservering(form({ tijd: '20:00' }), null).tijd).toBe(
        'Workshops in de bar starten uiterlijk om 19:00.',
      );
    });
  });
});

describe('foutenVanStap', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps workshop errors in step 1 and contact errors in step 2', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NU);

    const leeg = valideerReservering(
      { ...LEGE_RESERVERING, waar: 'bar' },
      ctx,
    );

    expect(Object.keys(foutenVanStap(leeg, 1))).toEqual(['personen', 'arrangement', 'datum', 'tijd']);
    expect(Object.keys(foutenVanStap(leeg, 2))).toEqual(['naam', 'email', 'telefoon']);
  });

  it('puts the on-location address in step 1, with the workshop', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NU);

    const opLocatie = valideerReservering({ ...LEGE_RESERVERING, waar: 'locatie' }, ctx);
    const stap1 = foutenVanStap(opLocatie, 1);
    expect(stap1.plaats).toBe('Vul de plaats in.');
    expect(stap1.adres).toBe('Vul het adres in.');
    expect(foutenVanStap(opLocatie, 2).adres).toBeUndefined();
  });

  it('reports step 1 as clean once the workshop details are filled in, even with no contact details yet', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NU);

    const alleenWorkshop = form({ naam: '', email: '', telefoon: '' });
    const fouten = valideerReservering(alleenWorkshop, ctx);
    expect(foutenVanStap(fouten, 1)).toEqual({});
    expect(Object.keys(foutenVanStap(fouten, 2))).toEqual(['naam', 'email', 'telefoon']);
  });
});

describe('barTijdvenster', () => {
  it('caps the window at the last workshop start time', () => {
    expect(barTijdvenster(ZATERDAG, availability)).toEqual({ start: '15:00', eind: '19:00' });
  });

  it('handles a closing time past midnight without collapsing the window', () => {
    const vrijdag = '2026-07-10';
    expect(barTijdvenster(vrijdag, availability)).toEqual({ start: '16:00', eind: '19:00' });
  });

  it('returns null on a closed weekday', () => {
    const zondag = '2026-07-12';
    expect(barTijdvenster(zondag, availability)).toBeNull();
  });

  it('returns null when the bar only opens after the last start time', () => {
    const laat: Availability[] = [{ id: 'l', weekday: 6, is_available: true, start_time: '20:00', end_time: '23:00' }];
    expect(barTijdvenster(ZATERDAG, laat)).toBeNull();
  });

  it('falls back to the 19:00 cap alone when opening hours are unknown', () => {
    expect(barTijdvenster(ZATERDAG, null)).toEqual({ start: '00:00', eind: '19:00' });
  });
});

describe('mailto', () => {
  it('puts the guest name and the date in the subject', () => {
    expect(bouwOnderwerp(form())).toBe('Workshopreservering – Jan Jansen – zaterdag 11 juli 2026');
  });

  it('lists the arrangement for a bar workshop and no address', () => {
    const body = bouwBericht(form());
    expect(body).toContain('Workshop: In de bar (Rijssen)');
    expect(body).toContain('Arrangement: Bites (€ 32 p.p. — 1,5 tot 2 uur)');
    expect(body).toContain('Aantal personen: 6');
    expect(body).toContain('Datum: zaterdag 11 juli 2026');
    expect(body).toContain('Begintijd: 18:00');
    expect(body).not.toContain('Adres:');
  });

  it('lists the address for an on-location workshop and no arrangement', () => {
    const body = bouwBericht(
      form({ waar: 'locatie', personen: '20', arrangement: null, plaats: 'Rijssen', adres: 'Grotestraat 12' }),
    );
    expect(body).toContain('Workshop: Op locatie');
    expect(body).toContain('Adres: Grotestraat 12, Rijssen');
    expect(body).not.toContain('Arrangement:');
  });

  it('includes the optional message only when filled in', () => {
    expect(bouwBericht(form())).not.toContain('Bericht:');
    expect(bouwBericht(form({ bericht: 'Twee mensen zonder alcohol.' }))).toContain(
      'Twee mensen zonder alcohol.',
    );
  });

  it('builds a mailto href that survives special characters', () => {
    const href = bouwMailtoHref(form({ bericht: 'Vraag: mag het & zonder alcohol?' }));
    expect(href.startsWith('mailto:Theqingzakelijk@gmail.com?subject=')).toBe(true);
    // A raw '&' would end the body parameter and silently truncate the mail.
    expect(href).toContain('%26');
    expect(href).not.toMatch(/body=[^&]*&(?!$)/);
  });
});

describe('bouwQuoteRequest', () => {
  const pakketten: WorkshopPakket[] = [
    { id: 'pkg-bites', package_name: 'Workshop in de Bar (Bites)', price: 32 },
    { id: 'pkg-street', package_name: 'Workshop in de Bar (Streetfood)', price: 42 },
    { id: 'pkg-locatie', package_name: 'Workshop op Locatie', price: 32 },
  ];

  it('maps a bar reservation onto the chosen arrangement package', () => {
    const req = bouwQuoteRequest(form({ personen: '6', arrangement: 'Bites' }), pakketten);
    expect(req).not.toBeNull();
    expect(req).toMatchObject({
      full_name: 'Jan Jansen',
      email: 'jan@example.com',
      package_id: 'pkg-bites',
      source: 'workshop_bar',
      arrangement: 'Bites',
      guest_count: 6,
      estimated_total: 192, // 6 x 32
      event_city: 'Rijssen',
      event_address: '',
    });
  });

  it('prices Streetfood from its own package', () => {
    const req = bouwQuoteRequest(form({ personen: '10', arrangement: 'Streetfood' }), pakketten);
    expect(req?.package_id).toBe('pkg-street');
    expect(req?.estimated_total).toBe(420); // 10 x 42
  });

  it('maps an on-location reservation with address and its own source', () => {
    const req = bouwQuoteRequest(
      form({ waar: 'locatie', personen: '20', arrangement: null, plaats: 'Rijssen', adres: 'Grotestraat 12' }),
      pakketten,
    );
    expect(req).toMatchObject({
      package_id: 'pkg-locatie',
      source: 'wizard_workshop_locatie',
      arrangement: null,
      event_city: 'Rijssen',
      event_address: 'Grotestraat 12',
      estimated_total: 640, // 20 x 32
    });
  });

  it('counts two cocktails per guest, because that is what a workshop makes', () => {
    expect(bouwQuoteRequest(form({ personen: '8' }), pakketten)?.cocktail_count).toBe(16);
  });

  it('normalises a loosely typed time', () => {
    expect(bouwQuoteRequest(form({ tijd: '19u30' }), pakketten)?.event_time).toBe('19:30');
  });

  it('keeps an empty message out of special_requests', () => {
    expect(bouwQuoteRequest(form({ bericht: '  ' }), pakketten)?.special_requests).toBeNull();
    expect(bouwQuoteRequest(form({ bericht: 'Geen noten' }), pakketten)?.special_requests).toBe('Geen noten');
  });

  it('returns null when the matching package is missing, so the caller can fall back to mail', () => {
    expect(bouwQuoteRequest(form({ arrangement: 'Bites' }), [])).toBeNull();
    expect(bouwQuoteRequest(form({ waar: 'locatie', arrangement: null }), [pakketten[0]])).toBeNull();
  });
});
