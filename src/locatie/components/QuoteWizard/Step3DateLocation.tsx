import type { Availability, BlockedDate, ServiceSettings } from '../../../shared/types/db';
import { isDateSelectable } from '../../../shared/lib/availability';
import type { ConfirmedEventDate } from '../../../shared/lib/data';

interface Props {
  eventDate: string;
  eventCity: string;
  eventPostcode: string;
  distanceKm: number;
  availabilityCtx: { availability: Availability[]; blockedDates: BlockedDate[]; settings: ServiceSettings; confirmedRequests: ConfirmedEventDate[] } | null;
  onDateChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onPostcodeChange: (value: string) => void;
  onDistanceChange: (value: number) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step3DateLocation({
  eventDate, eventCity, eventPostcode, distanceKm, availabilityCtx,
  onDateChange, onCityChange, onPostcodeChange, onDistanceChange, onNext, onBack,
}: Props) {
  // Append a time to force local-time parsing (bare "YYYY-MM-DD" parses as UTC,
  // which caused the local/UTC mismatch bug fixed in availability.ts's isDateSelectable).
  const selectedDateInvalid =
    eventDate !== '' && availabilityCtx !== null && !isDateSelectable(new Date(`${eventDate}T12:00:00`), availabilityCtx);

  const canProceed = eventDate !== '' && !selectedDateInvalid && eventCity.trim() !== '' && eventPostcode.trim() !== '';

  return (
    <div>
      <h3 className="font-heading text-2xl mb-6">Datum en locatie</h3>

      <label className="block mb-3">
        <span className="block text-sm uppercase tracking-widest text-muted mb-3">Evenementdatum</span>
        <input
          type="date"
          value={eventDate}
          onChange={(e) => onDateChange(e.target.value)}
          aria-invalid={selectedDateInvalid}
          aria-describedby={selectedDateInvalid ? 'event-date-error' : undefined}
          className="w-full rounded-lg bg-surface border border-white/15 px-5 py-3.5 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light"
        />
      </label>
      {selectedDateInvalid && (
        <p id="event-date-error" role="alert" className="text-sm text-red-300/90 mb-6">Deze datum is niet beschikbaar. Kies een andere datum.</p>
      )}
      {!selectedDateInvalid && <div className="mb-6" />}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <label className="block">
          <span className="block text-sm uppercase tracking-widest text-muted mb-3">Plaats</span>
          <input
            type="text"
            value={eventCity}
            onChange={(e) => onCityChange(e.target.value)}
            className="w-full rounded-lg bg-surface border border-white/15 px-5 py-3.5 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light"
          />
        </label>
        <label className="block">
          <span className="block text-sm uppercase tracking-widest text-muted mb-3">Postcode</span>
          <input
            type="text"
            value={eventPostcode}
            onChange={(e) => onPostcodeChange(e.target.value)}
            className="w-full rounded-lg bg-surface border border-white/15 px-5 py-3.5 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light"
          />
        </label>
      </div>

      <label className="block mb-10">
        <span className="block text-sm uppercase tracking-widest text-muted mb-3">Geschatte afstand vanaf Rijssen (km)</span>
        <input
          type="number"
          min={0}
          value={distanceKm}
          onChange={(e) => onDistanceChange(Number(e.target.value))}
          className="w-full rounded-lg bg-surface border border-white/15 px-5 py-3.5 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light"
        />
      </label>

      <div className="flex gap-4">
        <button type="button" onClick={onBack} className="rounded-full px-8 py-4 border border-white/20 text-white hover:border-gold-light hover:-translate-y-0.5 active:translate-y-0 transition-transform duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2">
          Terug
        </button>
        <button type="button" disabled={!canProceed} onClick={onNext} className="rounded-full px-8 py-4 bg-gradient-to-b from-gold-light to-primary-dark text-surface font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0 transition-transform duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2">
          Volgende stap
        </button>
      </div>
    </div>
  );
}
