import { useState } from 'react';
import type { ServicePackage, ServiceSettings } from '../../../shared/types/db';
import { computeQuote, QuoteValidationError, type QuoteBreakdown } from '../../../shared/lib/quote';
import { submitQuoteRequest } from '../../../shared/lib/data';
import type { WizardState } from './QuoteWizard';

interface Props {
  state: WizardState;
  pkg: ServicePackage;
  settings: ServiceSettings;
  onBack: () => void;
  onSubmitted: () => void;
}

export function Step5Summary({ state, pkg, settings, onBack, onSubmitted }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  let breakdown: QuoteBreakdown | null = null;
  let validationError: string | null = null;
  try {
    breakdown = computeQuote(pkg, settings, {
      cocktailCount: state.cocktailCount,
      guestCount: state.guestCount,
      distanceKm: state.distanceKm,
    });
  } catch (err) {
    if (err instanceof QuoteValidationError) validationError = err.message;
    else throw err;
  }

  async function handleSubmit() {
    if (submitting || !breakdown) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitQuoteRequest({
        full_name: state.fullName,
        email: state.email,
        phone: state.phone,
        event_type: state.eventType,
        guest_count: state.guestCount,
        cocktail_count: state.cocktailCount,
        package_id: pkg.id,
        event_date: state.eventDate,
        event_time: state.eventTime || null,
        event_city: state.eventCity,
        event_postcode: state.eventPostcode,
        distance_km: state.distanceKm,
        estimated_total: breakdown.total,
        special_requests: state.specialRequests || null,
      });
      onSubmitted();
    } catch (err) {
      console.error('Failed to submit quote request', err);
      setSubmitError('Er ging iets mis bij het versturen. Probeer het opnieuw.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h3 className="font-heading text-base md:text-3xl mb-4 md:mb-6">Offerte overzicht</h3>

      <dl className="grid grid-cols-2 gap-y-2 md:gap-y-3 text-sm md:text-base text-muted mb-5 md:mb-8">
        <dt>Pakket</dt><dd className="text-white text-right">{pkg.package_name}</dd>
        <dt>Evenement</dt><dd className="text-white text-right">{state.eventType}</dd>
        <dt>Datum</dt><dd className="text-white text-right">{state.eventDate}</dd>
        {state.eventTime && (<><dt>Begintijd</dt><dd className="text-white text-right">{state.eventTime}</dd></>)}
        <dt>Locatie</dt><dd className="text-white text-right">{state.eventCity} ({state.eventPostcode})</dd>
        <dt>Gasten</dt><dd className="text-white text-right">{state.guestCount}</dd>
        {pkg.price_unit === 'per_cocktail' && (<><dt>Cocktails</dt><dd className="text-white text-right">{state.cocktailCount}</dd></>)}
      </dl>

      {validationError && <p role="alert" className="text-red-300/90 mb-8">{validationError}</p>}

      {breakdown && (
        <div className="rounded-xl bg-surface border border-gold/20 p-4 md:p-6 mb-5 md:mb-8">
          <div className="flex justify-between text-sm md:text-base text-muted mb-1.5 md:mb-2"><span>Subtotaal</span><span>&euro;{breakdown.subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm md:text-base text-muted mb-3 md:mb-4"><span>Voorrijkosten</span><span>&euro;{breakdown.travelFee.toFixed(2)}</span></div>
          <div className="flex justify-between text-lg md:text-xl font-heading text-gold-light border-t border-white/10 pt-3 md:pt-4"><span>Geschatte totaalprijs</span><span>&euro;{breakdown.total.toFixed(2)}</span></div>
        </div>
      )}

      {submitError && <p role="alert" className="text-red-300/90 mb-6">{submitError}</p>}

      <div className="flex gap-4">
        <button type="button" onClick={onBack} className="rounded-full px-6 py-2.5 text-base border border-white/20 text-white hover:border-gold-light active:opacity-90 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2">
          Terug
        </button>
        <button
          type="button"
          disabled={!breakdown || submitting}
          onClick={handleSubmit}
          className="btn-primary rounded-full px-6 py-2.5 text-base font-body font-semibold disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
        >
          {submitting ? 'Versturen...' : 'Offerte aanvragen'}
        </button>
      </div>
    </div>
  );
}
