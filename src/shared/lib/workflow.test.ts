import { describe, expect, it } from 'vitest';
import { allowedTransitions, attentionSignals, isTransitionAllowed, normalizeStatus } from './workflow';
import { documentTotals, lineTotalIncl } from './money';

const euro = (n: number) => `EUR ${n}`;

describe('normalizeStatus', () => {
  it('maps legacy confirmed to booked', () => {
    expect(normalizeStatus('confirmed')).toBe('booked');
    expect(normalizeStatus('booked')).toBe('booked');
    expect(normalizeStatus('new')).toBe('new');
  });
});

describe('allowedTransitions', () => {
  it('moves one step forward along the chain', () => {
    expect(allowedTransitions('new')).toContain('reviewed');
    expect(allowedTransitions('booked')).toContain('completed');
    expect(isTransitionAllowed('invoiced', 'paid')).toBe(true);
  });

  it('does not skip forward', () => {
    expect(isTransitionAllowed('new', 'booked')).toBe(false);
    expect(isTransitionAllowed('reviewed', 'completed')).toBe(false);
  });

  it('allows undoing backward along the chain', () => {
    expect(isTransitionAllowed('booked', 'quoted')).toBe(true);
    expect(isTransitionAllowed('completed', 'new')).toBe(true);
  });

  it('only declines while still a lead', () => {
    expect(isTransitionAllowed('quoted', 'declined')).toBe(true);
    expect(isTransitionAllowed('booked', 'declined')).toBe(false);
  });

  it('only cancels once booked and before paid', () => {
    expect(isTransitionAllowed('booked', 'cancelled')).toBe(true);
    expect(isTransitionAllowed('quoted', 'cancelled')).toBe(false);
    expect(isTransitionAllowed('paid', 'cancelled')).toBe(false);
  });

  it('treats paid as terminal apart from undo to invoiced', () => {
    expect(allowedTransitions('paid')).toEqual(['invoiced']);
  });

  it('reopens dead leads', () => {
    expect(allowedTransitions('declined')).toEqual(['new', 'reviewed', 'quoted']);
    expect(isTransitionAllowed('cancelled', 'quoted')).toBe(true);
  });

  it('handles legacy confirmed as booked', () => {
    expect(isTransitionAllowed('confirmed', 'completed')).toBe(true);
  });
});

describe('attentionSignals', () => {
  const settings = { nudge_new_days: 3, nudge_quote_days: 7 };
  const today = new Date(2026, 6, 18); // 18 juli 2026, local midnight

  const request = (over: Partial<Parameters<typeof attentionSignals>[0][number]> = {}) => ({
    id: 'r1', full_name: 'Marieke Jansen', event_type: 'Bruiloft',
    event_date: '2026-09-12', status: 'new' as const,
    created_at: '2026-07-13T10:00:00Z', ...over,
  });

  it('flags an unanswered request on the boundary day, not before', () => {
    const onBoundary = attentionSignals([request({ created_at: '2026-07-15T00:00:00' })], [], [], settings, today, euro);
    expect(onBoundary).toHaveLength(1);
    expect(onBoundary[0].kind).toBe('unanswered');
    expect(onBoundary[0].title).toBe('Jansen, bruiloft 12 sep');

    const tooFresh = attentionSignals([request({ created_at: '2026-07-16T00:00:00' })], [], [], settings, today, euro);
    expect(tooFresh).toHaveLength(0);
  });

  it('flags a silent quote only after the nudge period', () => {
    const quotes = [{ request_id: 'r1', status: 'sent' as const, sent_at: '2026-07-11T00:00:00' }];
    const hit = attentionSignals([request({ status: 'quoted' })], quotes, [], settings, today, euro);
    expect(hit).toHaveLength(1);
    expect(hit[0].kind).toBe('quote_silent');

    const fresh = [{ request_id: 'r1', status: 'sent' as const, sent_at: '2026-07-12T00:00:00' }];
    expect(attentionSignals([request({ status: 'quoted' })], fresh, [], settings, today, euro)).toHaveLength(0);
  });

  it('flags completed without invoice, silent once an invoice exists', () => {
    const done = request({ status: 'completed', event_date: '2026-06-28' });
    expect(attentionSignals([done], [], [], settings, today, euro)[0].kind).toBe('not_invoiced');

    const invoice = { id: 'i1', request_id: 'r1', invoice_number: 'F-2026-001', due_on: '2026-08-01', paid_on: null, total_incl: 500 };
    expect(attentionSignals([done], [], [invoice], settings, today, euro)).toHaveLength(0);
  });

  it('flags overdue invoices the day after due, not on the due date', () => {
    const overdue = { id: 'i1', request_id: 'r1', invoice_number: 'F-2026-014', due_on: '2026-07-17', paid_on: null, total_incl: 1240 };
    const signals = attentionSignals([request({ status: 'invoiced' })], [], [overdue], settings, today, euro);
    expect(signals).toHaveLength(1);
    expect(signals[0].kind).toBe('invoice_overdue');
    expect(signals[0].detail).toContain('EUR 1240');

    const dueToday = { ...overdue, due_on: '2026-07-18' };
    expect(attentionSignals([request({ status: 'invoiced' })], [], [dueToday], settings, today, euro)).toHaveLength(0);

    const paid = { ...overdue, paid_on: '2026-07-10' };
    expect(attentionSignals([request({ status: 'invoiced' })], [], [paid], settings, today, euro)).toHaveLength(0);
  });

  it('sorts worst first', () => {
    const requests = [
      request({ id: 'a', created_at: '2026-07-14T00:00:00' }),
      request({ id: 'b', full_name: 'Piet de Vries', created_at: '2026-07-08T00:00:00' }),
    ];
    const signals = attentionSignals(requests, [], [], settings, today, euro);
    expect(signals.map((s) => s.requestId)).toEqual(['b', 'a']);
  });
});

describe('documentTotals', () => {
  it('computes the VAT specification back from inclusive prices', () => {
    const { totalIncl, totalEx, totalVat, groups } = documentTotals([
      { quantity: 200, unit_price_incl: 8, vat_rate: 21 },
      { quantity: 1, unit_price_incl: 50, vat_rate: 21 },
    ]);
    expect(totalIncl).toBe(1650);
    expect(totalEx).toBe(1363.64);
    expect(totalVat).toBe(286.36);
    expect(groups).toHaveLength(1);
  });

  it('rounds on the group total so lines and totals stay consistent', () => {
    // 3 x 0.33 incl: per-line rounding would give 0.99; the group must too.
    const { totalIncl, totalEx, totalVat } = documentTotals([
      { quantity: 1, unit_price_incl: 0.33, vat_rate: 21 },
      { quantity: 1, unit_price_incl: 0.33, vat_rate: 21 },
      { quantity: 1, unit_price_incl: 0.33, vat_rate: 21 },
    ]);
    expect(totalIncl).toBe(0.99);
    expect(totalEx + totalVat).toBeCloseTo(totalIncl, 10);
  });

  it('splits per rate when rates differ', () => {
    const { groups, totalIncl } = documentTotals([
      { quantity: 10, unit_price_incl: 12.1, vat_rate: 21 },
      { quantity: 10, unit_price_incl: 10.9, vat_rate: 9 },
    ]);
    expect(groups.map((g) => g.rate)).toEqual([9, 21]);
    expect(totalIncl).toBe(230);
  });

  it('computes line totals in cents', () => {
    expect(lineTotalIncl({ quantity: 2.5, unit_price_incl: 3.333, vat_rate: 21 })).toBe(8.33);
  });
});
