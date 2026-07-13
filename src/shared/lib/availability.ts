import type { Availability, BlockedDate, ServiceSettings } from '../types/db';

// isDateSelectable() only ever reads `.status` and `.event_date` off each
// confirmedRequests entry (see the double-booking check below). Callers may
// pass either full QuoteRequest rows (e.g. tests) or the minimal
// ConfirmedEventDate shape that the public-facing fetchAvailabilityContext()
// returns (src/shared/lib/data.ts) to avoid leaking PII columns — both
// satisfy this structurally, so we type against the minimal shape rather
// than QuoteRequest.
export interface ConfirmedRequestLike {
  status: string;
  event_date: string;
}

// isDateSelectable() only reads `booking_notice_hours` off `settings`, so the
// context asks for no more than that. Callers holding a full ServiceSettings
// row (the quote wizard) still satisfy this structurally; callers that have no
// settings row at all (the workshops form, which falls back to a fixed notice
// window when Supabase is unreachable) can synthesize one without inventing
// values for a dozen unrelated columns.
export interface AvailabilityContext {
  availability: Availability[];
  blockedDates: BlockedDate[];
  settings: Pick<ServiceSettings, 'booking_notice_hours'>;
  confirmedRequests: ConfirmedRequestLike[];
}

function toDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isDateSelectable(date: Date, ctx: AvailabilityContext): boolean {
  const weekday = date.getDay();
  const dayRule = ctx.availability.find((a) => a.weekday === weekday);
  if (!dayRule || !dayRule.is_available) return false;

  const dateStr = toDateOnly(date);
  if (ctx.blockedDates.some((b) => b.blocked_date === dateStr)) return false;

  const earliestAllowed = new Date(Date.now() + ctx.settings.booking_notice_hours * 60 * 60 * 1000);
  if (date.getTime() < earliestAllowed.getTime()) return false;

  if (ctx.confirmedRequests.some((r) => r.status === 'confirmed' && r.event_date === dateStr)) return false;

  return true;
}
