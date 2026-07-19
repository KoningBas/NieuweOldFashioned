// Status chain, transitions and the dashboard attention signals.
// Pure functions, no React, no Supabase — everything here is unit-testable.

import type { Invoice, Quote, QuoteRequest, QuoteStatus } from '../types/db';
import { parseDateOnly } from './format';

/** Canonical status: migration 0003 renames 'confirmed' to 'booked', but the
 *  UI must render correctly against a database where it has not run yet. */
export type CanonicalStatus = Exclude<QuoteStatus, 'confirmed'>;

export function normalizeStatus(status: QuoteStatus): CanonicalStatus {
  return status === 'confirmed' ? 'booked' : status;
}

/** The forward chain, in order. Side exits (declined/cancelled) sit outside it. */
export const STATUS_CHAIN: CanonicalStatus[] = [
  'new', 'reviewed', 'quoted', 'booked', 'completed', 'invoiced', 'paid',
];

export const STATUS_LABELS: Record<CanonicalStatus, string> = {
  new: 'Nieuw',
  reviewed: 'Bekeken',
  quoted: 'Offerte verstuurd',
  booked: 'Geboekt',
  completed: 'Uitgevoerd',
  invoiced: 'Gefactureerd',
  paid: 'Betaald',
  declined: 'Afgewezen',
  cancelled: 'Geannuleerd',
};

/** Statuses hidden by default in the requests list — the archive. */
export const ARCHIVE_STATUSES: CanonicalStatus[] = ['paid', 'declined', 'cancelled'];

/**
 * Which transitions the status control offers.
 * - Forward: one step along the chain.
 * - Backward: any earlier chain step (undoing a mis-click must always work).
 * - declined: only while still a lead (new/reviewed/quoted).
 * - cancelled: only once booked and not yet paid.
 * - paid is terminal apart from the undo back to invoiced.
 */
export function allowedTransitions(from: QuoteStatus): CanonicalStatus[] {
  const s = normalizeStatus(from);
  if (s === 'declined' || s === 'cancelled') {
    // Reopen a dead lead: back to where it can be picked up again.
    return ['new', 'reviewed', 'quoted'];
  }
  const i = STATUS_CHAIN.indexOf(s);
  const targets: CanonicalStatus[] = [];
  for (let j = 0; j < STATUS_CHAIN.length; j++) {
    if (j === i) continue;
    if (j === i + 1) targets.push(STATUS_CHAIN[j]);       // one step forward
    if (j < i && s !== 'paid') targets.push(STATUS_CHAIN[j]); // undo backward
  }
  if (s === 'paid') targets.push('invoiced');              // only undo from paid
  if (s === 'new' || s === 'reviewed' || s === 'quoted') targets.push('declined');
  if (s === 'booked' || s === 'completed' || s === 'invoiced') targets.push('cancelled');
  return targets;
}

export function isTransitionAllowed(from: QuoteStatus, to: QuoteStatus): boolean {
  return allowedTransitions(from).includes(normalizeStatus(to));
}

// --- Dashboard attention signals -------------------------------------------

export type SignalKind = 'unanswered' | 'quote_silent' | 'not_invoiced' | 'invoice_overdue';

export interface AttentionSignal {
  kind: SignalKind;
  requestId: string;
  /** Who/what the row is about, e.g. "Jansen, bruiloft 12 sep". */
  title: string;
  /** What is wrong, e.g. "aanvraag ligt 5 dagen". */
  detail: string;
  /** Days the item has been waiting — used for sorting, worst first. */
  days: number;
  href: string;
}

interface SignalSettings {
  nudge_new_days: number;
  nudge_quote_days: number;
}

type SignalRequest = Pick<QuoteRequest, 'id' | 'full_name' | 'event_type' | 'event_date' | 'status' | 'created_at'>;
type SignalQuote = Pick<Quote, 'request_id' | 'status' | 'sent_at'>;
type SignalInvoice = Pick<Invoice, 'id' | 'request_id' | 'invoice_number' | 'due_on' | 'paid_on' | 'total_incl'>;

const MS_PER_DAY = 86_400_000;

function daysBetween(fromIso: string, today: Date): number {
  // Timestamps compare as instants; date-only strings as local calendar days.
  const from = fromIso.includes('T') ? new Date(fromIso) : parseDateOnly(fromIso);
  return Math.floor((today.getTime() - from.getTime()) / MS_PER_DAY);
}

const NL_DAY_MONTH = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' });

function requestTitle(r: SignalRequest): string {
  const surname = r.full_name.trim().split(/\s+/).slice(-1)[0] || r.full_name;
  return `${surname}, ${r.event_type.toLowerCase()} ${NL_DAY_MONTH.format(parseDateOnly(r.event_date))}`;
}

/**
 * The four signals, all derivable from dates and statuses:
 * 1. unanswered      — new/reviewed older than nudge_new_days
 * 2. quote_silent    — quoted, quote sent more than nudge_quote_days ago
 * 3. not_invoiced    — completed, no invoice row
 * 4. invoice_overdue — past due_on, paid_on empty
 */
export function attentionSignals(
  requests: SignalRequest[],
  quotes: SignalQuote[],
  invoices: SignalInvoice[],
  settings: SignalSettings,
  today: Date,
  formatEuro: (n: number) => string,
): AttentionSignal[] {
  const signals: AttentionSignal[] = [];
  const requestById = new Map(requests.map((r) => [r.id, r]));
  const invoicedRequestIds = new Set(invoices.map((i) => i.request_id));
  const sentQuoteByRequest = new Map<string, SignalQuote>();
  for (const q of quotes) {
    if (q.status === 'sent' && q.sent_at) sentQuoteByRequest.set(q.request_id, q);
  }

  for (const r of requests) {
    const status = normalizeStatus(r.status);

    if ((status === 'new' || status === 'reviewed')) {
      const days = daysBetween(r.created_at, today);
      if (days >= settings.nudge_new_days) {
        signals.push({
          kind: 'unanswered', requestId: r.id, title: requestTitle(r),
          detail: `aanvraag ligt ${days} ${days === 1 ? 'dag' : 'dagen'}`,
          days, href: `/aanvragen/${r.id}`,
        });
      }
    }

    if (status === 'quoted') {
      const quote = sentQuoteByRequest.get(r.id);
      if (quote?.sent_at) {
        const days = daysBetween(quote.sent_at, today);
        if (days >= settings.nudge_quote_days) {
          signals.push({
            kind: 'quote_silent', requestId: r.id, title: requestTitle(r),
            detail: `offerte ${days} ${days === 1 ? 'dag' : 'dagen'} stil`,
            days, href: `/aanvragen/${r.id}`,
          });
        }
      }
    }

    if (status === 'completed' && !invoicedRequestIds.has(r.id)) {
      const days = Math.max(0, daysBetween(r.event_date, today));
      signals.push({
        kind: 'not_invoiced', requestId: r.id, title: requestTitle(r),
        detail: 'klus gedaan, geen factuur',
        days, href: `/aanvragen/${r.id}?tab=factuur`,
      });
    }
  }

  for (const inv of invoices) {
    if (inv.paid_on) continue;
    const days = daysBetween(inv.due_on, today);
    if (days > 0) {
      const r = requestById.get(inv.request_id);
      signals.push({
        kind: 'invoice_overdue', requestId: inv.request_id,
        title: r ? `${inv.invoice_number}, ${r.full_name.trim().split(/\s+/).slice(-1)[0]}` : inv.invoice_number,
        detail: `${days} ${days === 1 ? 'dag' : 'dagen'} over termijn, ${formatEuro(inv.total_incl)}`,
        days, href: `/aanvragen/${inv.request_id}?tab=factuur`,
      });
    }
  }

  return signals.sort((a, b) => b.days - a.days);
}
