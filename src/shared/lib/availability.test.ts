import { afterEach, describe, it, expect, vi } from 'vitest';
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

describe('isDateSelectable', () => {
  afterEach(() => {
    vi.useRealTimers();
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
    const dateStr = friday.toISOString().slice(0, 10);
    const blockedDates: BlockedDate[] = [{ id: 'b1', blocked_date: dateStr, reason: 'Prive-evenement', created_at: '2026-01-01' }];
    expect(isDateSelectable(friday, { availability, blockedDates, settings, confirmedRequests: [] })).toBe(false);
  });

  it('rejects a date already confirmed by another quote request', () => {
    const friday = nextWeekday(5, 5);
    const dateStr = friday.toISOString().slice(0, 10);
    const confirmedRequests: QuoteRequest[] = [{
      id: 'q1', full_name: '', email: '', phone: '', event_type: '', guest_count: 10, cocktail_count: 50,
      package_id: 'p1', event_date: dateStr, event_city: '', event_postcode: '', distance_km: 5,
      estimated_total: 0, status: 'confirmed', special_requests: null, created_at: '2026-01-01',
    }];
    expect(isDateSelectable(friday, { availability, blockedDates: [], settings, confirmedRequests })).toBe(false);
  });
});
