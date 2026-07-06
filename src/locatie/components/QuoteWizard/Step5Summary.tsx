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
    if (!breakdown) return;
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
      <h3 className="font-heading text-2xl mb-6">Offerte overzicht</h3>

      <dl className="grid grid-cols-2 gap-y-3 text-muted mb-8">
        <dt>Pakket</dt><dd className="text-white text-right">{pkg.package_name}</dd>
        <dt>Evenement</dt><dd className="text-white text-right">{state.eventType}</dd>
        <dt>Datum</dt><dd className="text-white text-right">{state.eventDate}</dd>
        <dt>Locatie</dt><dd className="text-white text-right">{state.eventCity} ({state.eventPostcode})</dd>
        <dt>Gasten</dt><dd className="text-white text-right">{state.guestCount}</dd>
        {pkg.price_unit === 'per_cocktail' && (<><dt>Cocktails</dt><dd className="text-white text-right">{state.cocktailCount}</dd></>)}
      </dl>

      {validationError && <p className="text-red-300/90 mb-8">{validationError}</p>}

      {breakdown && (
        <div className="rounded-xl bg-surface border border-gold/20 p-6 mb-8">
          <div className="flex justify-between text-muted mb-2"><span>Subtotaal</span><span>&euro;{breakdown.subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between text-muted mb-4"><span>Voorrijkosten</span><span>&euro;{breakdown.travelFee.toFixed(2)}</span></div>
          <div className="flex justify-between text-xl font-heading text-gold-light border-t border-white/10 pt-4"><span>Geschatte totaalprijs</span><span>&euro;{breakdown.total.toFixed(2)}</span></div>
        </div>
      )}

      {submitError && <p className="text-red-300/90 mb-6">{submitError}</p>}

      <div className="flex gap-4">
        <button type="button" onClick={onBack} className="rounded-full px-8 py-4 border border-white/20 text-white hover:border-gold-light hover:-translate-y-0.5 active:translate-y-0 transition-transform duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2">
          Terug
        </button>
        <button
          type="button"
          disabled={!breakdown || submitting}
          onClick={handleSubmit}
          className="rounded-full px-8 py-4 bg-gradient-to-b from-gold-light to-primary-dark text-surface font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0 transition-transform duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
        >
          {submitting ? 'Versturen...' : 'Offerte aanvragen'}
        </button>
      </div>
    </div>
  );
}
