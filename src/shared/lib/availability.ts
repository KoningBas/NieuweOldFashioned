import type { Availability, BlockedDate, QuoteRequest, ServiceSettings } from '../types/db';

export interface AvailabilityContext {
  availability: Availability[];
  blockedDates: BlockedDate[];
  settings: ServiceSettings;
  confirmedRequests: QuoteRequest[];
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
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
