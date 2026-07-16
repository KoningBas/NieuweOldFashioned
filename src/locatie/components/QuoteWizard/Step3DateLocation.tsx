import type { Availability, BlockedDate, ServiceSettings } from '../../../shared/types/db';
import { isDateSelectable } from '../../../shared/lib/availability';
import { parseDateOnly, formatDateLongNL } from '../../../shared/lib/format';
import type { ConfirmedEventDate } from '../../../shared/lib/data';
import { Calendar } from '../../../shared/components/Calendar';

interface Props {
  eventDate: string;
  eventTime: string;
  eventCity: string;
  eventPostcode: string;
  distanceKm: number;
  availabilityCtx: { availability: Availability[]; blockedDates: BlockedDate[]; settings: ServiceSettings; confirmedRequests: ConfirmedEventDate[] } | null;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onPostcodeChange: (value: string) => void;
  onDistanceChange: (value: number) => void;
  onNext: () => void;
  onBack: () => void;
}

const fieldClass =
  'w-full rounded-lg bg-surface border border-white/15 px-4 py-3 text-base md:px-5 md:py-3.5 md:text-lg text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light';
const labelClass = 'block text-sm md:text-lg text-white mb-2 md:mb-3';

export function Step3DateLocation({
  eventDate, eventTime, eventCity, eventPostcode, availabilityCtx,
  onDateChange, onTimeChange, onCityChange, onPostcodeChange, onNext, onBack,
}: Props) {
  // Append a time to force local-time parsing (bare "YYYY-MM-DD" parses as UTC,
  // which caused the local/UTC mismatch bug fixed in availability.ts's isDateSelectable).
  const selectedDateInvalid =
    eventDate !== '' && availabilityCtx !== null && !isDateSelectable(new Date(`${eventDate}T12:00:00`), availabilityCtx);

  // Usual opening window for the chosen weekday — shown as a non-blocking hint
  // under the time field. Purely informational; the time itself is not validated.
  const dayRule = eventDate !== '' && availabilityCtx
    ? availabilityCtx.availability.find((a) => a.weekday === parseDateOnly(eventDate).getDay() && a.is_available)
    : undefined;
  const hoursHint = dayRule ? `Meestal ${dayRule.start_time.slice(0, 5)}–${dayRule.end_time.slice(0, 5)}` : null;

  const canProceed =
    eventDate !== '' && !selectedDateInvalid && eventTime !== '' && eventCity.trim() !== '' && eventPostcode.trim() !== '';

  return (
    <div>
      <h3 className="font-heading text-base md:text-3xl mb-4 md:mb-6">Datum, tijd en locatie</h3>

      <div className="grid md:grid-cols-2 gap-5 md:gap-8">
        {/* Date: inline calendar on desktop, native picker on mobile */}
        <div>
          <span className={`${labelClass} md:sr-only`}>Evenementdatum</span>

          <div className="hidden md:block">
            <Calendar value={eventDate} onChange={onDateChange} ctx={availabilityCtx} />
            {eventDate !== '' && !selectedDateInvalid && (
              <p className="mt-3 text-base text-white">
                Gekozen: <span className="text-gold-light">{formatDateLongNL(eventDate)}</span>
              </p>
            )}
          </div>

          <input
            type="date"
            value={eventDate}
            onChange={(e) => onDateChange(e.target.value)}
            aria-invalid={selectedDateInvalid}
            aria-describedby={selectedDateInvalid ? 'event-date-error' : undefined}
            className={`md:hidden [color-scheme:dark] ${fieldClass}`}
          />

          {selectedDateInvalid && (
            <p id="event-date-error" role="alert" className="mt-2 md:mt-3 text-sm text-red-300/90">
              Deze datum is niet beschikbaar. Kies een andere datum.
            </p>
          )}
        </div>

        {/* Location + start time */}
        <div className="flex flex-col gap-4 md:gap-5">
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <label className="block">
              <span className={labelClass}>Plaats</span>
              <input type="text" value={eventCity} onChange={(e) => onCityChange(e.target.value)} className={fieldClass} />
            </label>
            <label className="block">
              <span className={labelClass}>Postcode</span>
              <input type="text" value={eventPostcode} onChange={(e) => onPostcodeChange(e.target.value)} className={fieldClass} />
            </label>
          </div>

          <label className="block">
            <span className={labelClass}>Begintijd</span>
            <input
              type="time"
              value={eventTime}
              onChange={(e) => onTimeChange(e.target.value)}
              aria-describedby={hoursHint ? 'event-time-hint' : undefined}
              className={`[color-scheme:dark] ${fieldClass}`}
            />
            {hoursHint && (
              <span id="event-time-hint" className="mt-2 block text-sm text-muted">{hoursHint}</span>
            )}
          </label>
        </div>
      </div>

      <div className="flex gap-4 mt-6 md:mt-10">
        <button type="button" onClick={onBack} className="rounded-full px-6 py-2.5 text-base border border-white/20 text-white hover:border-gold-light active:opacity-90 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2">
          Terug
        </button>
        <button type="button" disabled={!canProceed} onClick={onNext} className="btn-primary rounded-full px-6 py-2.5 text-base font-body font-semibold disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2">
          Verder
        </button>
      </div>
    </div>
  );
}
