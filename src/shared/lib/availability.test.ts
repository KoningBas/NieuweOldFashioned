/// <reference types="node" />

const ORIGINAL_TZ = process.env.TZ;
process.env.TZ = 'Pacific/Kiritimati';

import { afterAll, afterEach, describe, it, expect, vi } from 'vitest';
import { isDateSelectable } from './availability';
import type { Availability, BlockedDate, QuoteRequest, ServiceSettings } from '../types/db';

const settings: ServiceSettings = {
  id: '1', business_name: '', business_email: '', business_phone: '', business_address: '',
  cocktail_price: 8, min_cocktails: 50, workshop_price_per_person: 32,
  travel_fee_near: 50, travel_fee_far: 75, travel_near_km_limit: 10,
  booking_notice_hours: 72, max_guests: 200, created_at: '2026-01-01',
};

const availability: Availability[] = [
  { id: 'a0', weekday: 0, is_available: false, start_time: '18:00', end_time: '23:00' },
  { id: 'a4', weekday: 4, is_available: true, start_time: '18:00', end_time: '23:00' },
  { id: 'a5', weekday: 5, is_available: true, start_time: '18:00', end_time: '23:00' },
];

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function nextWeekday(target: number, minDaysOut: number): Date {
  let d = daysFromNow(minDaysOut);
  while (d.getDay() !== target) d.setDate(d.getDate() + 1);
  return d;
}

// Builds the same LOCAL calendar-day string that the (fixed) production
// `toDateOnly` derives, so fixtures built here stay consistent with the
// implementation no matter which TZ the process happens to run under
// (this file forces process.env.TZ = 'Pacific/Kiritimati', see below).
function toLocalDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

describe('isDateSelectable', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  afterAll(() => {
    if (ORIGINAL_TZ === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = ORIGINAL_TZ;
    }
  });

  it('rejects a weekday with no availability row or is_available=false', () => {
    const sunday = nextWeekday(0, 5);
    expect(isDateSelectable(sunday, { availability, blockedDates: [], settings, confirmedRequests: [] })).toBe(false);
  });

  it('accepts an available weekday far enough in the future', () => {
    const friday = nextWeekday(5, 5);
    expect(isDateSelectable(friday, { availability, blockedDates: [], settings, confirmedRequests: [] })).toBe(true);
  });

  it('rejects a date inside the booking notice window', () => {
    // Pin "now" to a known Friday so this is deterministic regardless of what
    // weekday the suite happens to run on (walking to "the next Friday" from
    // an arbitrary today can land anywhere from 0-6 days out, which isn't
    // reliably inside a 72h notice window — see commit history for details).
    const fixedFriday = new Date('2026-07-10T12:00:00');
    vi.useFakeTimers();
    vi.setSystemTime(fixedFriday);
    expect(isDateSelectable(fixedFriday, { availability, blockedDates: [], settings, confirmedRequests: [] })).toBe(false);
  });

  it('rejects a blocked date', () => {
    const friday = nextWeekday(5, 5);
    const dateStr = toLocalDateStr(friday);
    const blockedDates: BlockedDate[] = [{ id: 'b1', blocked_date: dateStr, reason: 'Prive-evenement', created_at: '2026-01-01' }];
    expect(isDateSelectable(friday, { availability, blockedDates, settings, confirmedRequests: [] })).toBe(false);
  });

  it('rejects a date already confirmed by another quote request', () => {
    const friday = nextWeekday(5, 5);
    const dateStr = toLocalDateStr(friday);
    const confirmedRequests: QuoteRequest[] = [{
      id: 'q1', full_name: '', email: '', phone: '', event_type: '', guest_count: 10, cocktail_count: 50,
      package_id: 'p1', event_date: dateStr, event_city: '', event_postcode: '', distance_km: 5,
      estimated_total: 0, status: 'confirmed', special_requests: null, created_at: '2026-01-01',
    }];
    expect(isDateSelectable(friday, { availability, blockedDates: [], settings, confirmedRequests })).toBe(false);
  });

  it('rejects a blocked date under a timezone where local and UTC calendar days diverge (regression for toDateOnly)', () => {
    // process.env.TZ = 'Pacific/Kiritimati' (UTC+14) is set for this whole file
    // (see the top of this file). For most local times, the UTC calendar day
    // is one day behind the local calendar day under this offset. This test
    // pins "now" safely in the past so the notice-hours check never interferes,
    // then proves the blocked-date match is computed against the same LOCAL
    // calendar day that `weekday` (via getDay()) uses — which is what the
    // toDateOnly() fix guarantees. Before the fix, toDateOnly used
    // date.toISOString().slice(0, 10) (the UTC day), which for this timestamp
    // resolves to '2026-07-09' — one day off from the local '2026-07-10' used
    // below — so the blocked-date entry would never have matched and this
    // date would have incorrectly been treated as selectable.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 12, 0)); // pinned far in the past relative to the candidate date

    const candidate = new Date(2026, 6, 10, 0, 30); // July 10 2026, 00:30 LOCAL time
    const localWeekday = candidate.getDay();

    const tzAvailability: Availability[] = [
      { id: 'tz1', weekday: localWeekday, is_available: true, start_time: '18:00', end_time: '23:00' },
    ];
    const blockedDates: BlockedDate[] = [
      { id: 'tzb1', blocked_date: '2026-07-10', reason: 'Prive-evenement', created_at: '2026-01-01' },
    ];

    expect(
      isDateSelectable(candidate, { availability: tzAvailability, blockedDates, settings, confirmedRequests: [] })
    ).toBe(false);
  });

  it('accepts a date exactly at the booking notice boundary (72h out)', () => {
    // The boundary is inclusive on the far side: `date.getTime() < earliestAllowed.getTime()`
    // means a date exactly `booking_notice_hours` away should be ACCEPTED, not rejected.
    const fixedNow = new Date('2026-07-07T12:00:00'); // Tuesday
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);
    const exactlyAtNotice = new Date(fixedNow.getTime() + settings.booking_notice_hours * 60 * 60 * 1000); // Friday, same time
    expect(
      isDateSelectable(exactlyAtNotice, { availability, blockedDates: [], settings, confirmedRequests: [] })
    ).toBe(true);
  });

  it('rejects a weekday with no availability row at all (distinct from is_available=false)', () => {
    // The fixture only has rows for weekday 0, 4 and 5 — weekday 2 (Tuesday)
    // has no row whatsoever, which should hit the `!dayRule` branch.
    const tuesday = nextWeekday(2, 5);
    expect(isDateSelectable(tuesday, { availability, blockedDates: [], settings, confirmedRequests: [] })).toBe(false);
  });

  it('does not reject a date for a non-confirmed quote request on the same day', () => {
    const friday = nextWeekday(5, 5);
    const dateStr = toLocalDateStr(friday);
    const nonConfirmedRequests: QuoteRequest[] = [{
      id: 'q2', full_name: '', email: '', phone: '', event_type: '', guest_count: 10, cocktail_count: 50,
      package_id: 'p1', event_date: dateStr, event_city: '', event_postcode: '', distance_km: 5,
      estimated_total: 0, status: 'new', special_requests: null, created_at: '2026-01-01',
    }];
    expect(
      isDateSelectable(friday, { availability, blockedDates: [], settings, confirmedRequests: nonConfirmedRequests })
    ).toBe(true);
  });
});
