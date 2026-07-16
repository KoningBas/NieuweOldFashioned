import { useEffect, useState } from 'react';
import { fetchAvailabilityContext, fetchFeaturedPackages, fetchServiceSettings, submitQuoteRequest } from '../../../shared/lib/data';
import type { Availability, BlockedDate, ServicePackage, ServiceSettings } from '../../../shared/types/db';
import type { ConfirmedEventDate } from '../../../shared/lib/data';
import { computeQuote, QuoteValidationError } from '../../../shared/lib/quote';
import { StepIndicator } from './StepIndicator';
import { Step1Package } from './Step1Package';
import { Step2Counts } from './Step2Counts';
import { Step3DateLocation } from './Step3DateLocation';
import { Step4Contact } from './Step4Contact';

export interface WizardState {
  step: number;
  packageId: string | null;
  eventType: string;
  guestCount: number;
  cocktailCount: number;
  eventDate: string;
  eventTime: string;
  eventCity: string;
  eventPostcode: string;
  distanceKm: number;
  fullName: string;
  email: string;
  phone: string;
  specialRequests: string;
}

const INITIAL_STATE: WizardState = {
  step: 1,
  packageId: null,
  eventType: '',
  guestCount: 0,
  cocktailCount: 0,
  eventDate: '',
  eventTime: '',
  eventCity: '',
  eventPostcode: '',
  distanceKm: 5,
  fullName: '',
  email: '',
  phone: '',
  specialRequests: '',
};

export function QuoteWizard() {
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [availabilityCtx, setAvailabilityCtx] = useState<{
    availability: Availability[]; blockedDates: BlockedDate[]; settings: ServiceSettings; confirmedRequests: ConfirmedEventDate[];
  } | null>(null);

  useEffect(() => {
    // Both on-location services run through this wizard: bartending and the
    // workshop. The guest picks one on step 1 — no pre-selection, since neither
    // is the default. Each package carries its own price_unit, which drives the
    // counts step and the quote total downstream.
    fetchFeaturedPackages().then((pkgs) => {
      setPackages(pkgs);
    }).catch((err) => {
      console.error('Failed to load featured packages', err);
      setPackages([]);
    });
  }, []);

  useEffect(() => {
    Promise.all([fetchServiceSettings(), fetchAvailabilityContext()])
      .then(([settingsData, ctx]) => {
        setAvailabilityCtx({ ...ctx, settings: settingsData });
      })
      .catch((err) => {
        console.error('Failed to load service settings / availability', err);
      });
  }, []);

  const selectedPackage = packages.find((p) => p.id === state.packageId) ?? null;

  // Final step submits directly (no separate summary/overview screen). The price
  // estimate is no longer shown to the guest, but we still compute it here so the
  // request stored server-side keeps its estimated_total.
  async function handleSubmit() {
    if (submitting || !selectedPackage || !availabilityCtx) return;

    let estimatedTotal: number;
    try {
      const breakdown = computeQuote(selectedPackage, availabilityCtx.settings, {
        cocktailCount: state.cocktailCount,
        guestCount: state.guestCount,
        distanceKm: state.distanceKm,
      });
      estimatedTotal = breakdown.total;
    } catch (err) {
      if (err instanceof QuoteValidationError) {
        setSubmitError(err.message);
        return;
      }
      throw err;
    }

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
        package_id: selectedPackage.id,
        event_date: state.eventDate,
        event_time: state.eventTime || null,
        event_city: state.eventCity,
        event_postcode: state.eventPostcode,
        distance_km: state.distanceKm,
        estimated_total: estimatedTotal,
        special_requests: state.specialRequests || null,
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to submit quote request', err);
      setSubmitError('Er ging iets mis bij het versturen. Probeer het opnieuw.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="offerte" className="py-8 md:py-28 px-5 md:px-10">
      <div className="max-w-4xl mx-auto">
        <p className="hidden md:block uppercase tracking-[0.3em] text-gold-light text-base mb-3 md:mb-4">Offerte aanvragen</p>
        <h2 className="font-heading text-xl md:text-5xl tracking-[-0.02em] whitespace-nowrap md:whitespace-normal mb-4 md:mb-12">Vraag direct een offerte aan</h2>

        <StepIndicator current={state.step} />

        <div className="rounded-2xl bg-surface border border-white/10 p-5 md:p-10 shadow-[0_25px_60px_-20px_rgba(0,0,0,0.6)]">
          {state.step === 1 && (
            <Step1Package
              packages={packages}
              selectedPackageId={state.packageId}
              eventType={state.eventType}
              onSelectPackage={(id) => setState((s) => ({ ...s, packageId: id }))}
              onEventTypeChange={(value) => setState((s) => ({ ...s, eventType: value }))}
              onNext={() => setState((s) => ({ ...s, step: 2 }))}
            />
          )}
          {state.step === 2 && selectedPackage && (
            <Step2Counts
              pkg={selectedPackage}
              guestCount={state.guestCount}
              cocktailCount={state.cocktailCount}
              onGuestCountChange={(v) => setState((s) => ({ ...s, guestCount: v }))}
              onCocktailCountChange={(v) => setState((s) => ({ ...s, cocktailCount: v }))}
              onNext={() => setState((s) => ({ ...s, step: 3 }))}
              onBack={() => setState((s) => ({ ...s, step: 1 }))}
            />
          )}
          {state.step === 3 && (
            <Step3DateLocation
              eventDate={state.eventDate}
              eventTime={state.eventTime}
              eventCity={state.eventCity}
              eventPostcode={state.eventPostcode}
              distanceKm={state.distanceKm}
              availabilityCtx={availabilityCtx}
              onDateChange={(v) => setState((s) => ({ ...s, eventDate: v }))}
              onTimeChange={(v) => setState((s) => ({ ...s, eventTime: v }))}
              onCityChange={(v) => setState((s) => ({ ...s, eventCity: v }))}
              onPostcodeChange={(v) => setState((s) => ({ ...s, eventPostcode: v }))}
              onDistanceChange={(v) => setState((s) => ({ ...s, distanceKm: v }))}
              onNext={() => setState((s) => ({ ...s, step: 4 }))}
              onBack={() => setState((s) => ({ ...s, step: 2 }))}
            />
          )}
          {state.step === 4 && !submitted && (
            <Step4Contact
              fullName={state.fullName}
              email={state.email}
              phone={state.phone}
              specialRequests={state.specialRequests}
              onFullNameChange={(v) => setState((s) => ({ ...s, fullName: v }))}
              onEmailChange={(v) => setState((s) => ({ ...s, email: v }))}
              onPhoneChange={(v) => setState((s) => ({ ...s, phone: v }))}
              onSpecialRequestsChange={(v) => setState((s) => ({ ...s, specialRequests: v }))}
              onSubmit={handleSubmit}
              onBack={() => setState((s) => ({ ...s, step: 3 }))}
              submitting={submitting}
              ready={selectedPackage !== null && availabilityCtx !== null}
              submitError={submitError}
            />
          )}
          {submitted && (
            <div className="text-center py-10">
              <h3 className="font-heading text-3xl text-gold-light mb-4">Je aanvraag is binnen</h3>
              <p className="text-white text-lg max-w-md mx-auto leading-[1.7]">
                Bedankt, {state.fullName}. We hebben je aanvraag ontvangen en nemen zo snel mogelijk contact met je op.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
