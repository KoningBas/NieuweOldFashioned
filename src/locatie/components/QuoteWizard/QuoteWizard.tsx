import { useEffect, useState } from 'react';
import { fetchAvailabilityContext, fetchFeaturedPackages, fetchServiceSettings } from '../../../shared/lib/data';
import type { Availability, BlockedDate, ServicePackage, ServiceSettings } from '../../../shared/types/db';
import type { ConfirmedEventDate } from '../../../shared/lib/data';
import { StepIndicator } from './StepIndicator';
import { Step1Package } from './Step1Package';
import { Step2Counts } from './Step2Counts';
import { Step3DateLocation } from './Step3DateLocation';
import { Step4Contact } from './Step4Contact';
import { Step5Summary } from './Step5Summary';

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
  const [availabilityCtx, setAvailabilityCtx] = useState<{
    availability: Availability[]; blockedDates: BlockedDate[]; settings: ServiceSettings; confirmedRequests: ConfirmedEventDate[];
  } | null>(null);

  useEffect(() => {
    fetchFeaturedPackages().then((pkgs) => {
      // Only the on-location bartending service is offered through this wizard,
      // presented under the page's brand name "Cocktails op Locatie". Workshops
      // are handled elsewhere, so they are excluded here. The quote still submits
      // the real package_id; only the display name is overridden.
      const filtered = pkgs
        .filter((p) => !/workshop/i.test(p.package_name))
        .map((p) => ({ ...p, package_name: 'Cocktails op Locatie' }));
      const list = filtered.length > 0 ? filtered : pkgs;
      setPackages(list);
      // Single service → pre-select it so the visitor lands on the event-type choice.
      if (list.length > 0) {
        setState((s) => (s.packageId ? s : { ...s, packageId: list[0].id }));
      }
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

  return (
    <section id="offerte" className="py-8 md:py-28 px-5 md:px-10">
      <div className="max-w-4xl mx-auto">
        <p className="hidden md:block uppercase tracking-[0.3em] text-gold-light text-base mb-3 md:mb-4">Offerte aanvragen</p>
        <h2 className="font-heading text-xl md:text-5xl tracking-[-0.02em] whitespace-nowrap md:whitespace-normal mb-4 md:mb-12">Vraag direct een offerte aan</h2>

        <StepIndicator current={state.step} />

        <div className="rounded-2xl bg-surface-elevated border border-white/5 p-5 md:p-10 shadow-[0_25px_60px_-20px_rgba(0,0,0,0.6)]">
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
          {state.step === 4 && (
            <Step4Contact
              fullName={state.fullName}
              email={state.email}
              phone={state.phone}
              specialRequests={state.specialRequests}
              onFullNameChange={(v) => setState((s) => ({ ...s, fullName: v }))}
              onEmailChange={(v) => setState((s) => ({ ...s, email: v }))}
              onPhoneChange={(v) => setState((s) => ({ ...s, phone: v }))}
              onSpecialRequestsChange={(v) => setState((s) => ({ ...s, specialRequests: v }))}
              onNext={() => setState((s) => ({ ...s, step: 5 }))}
              onBack={() => setState((s) => ({ ...s, step: 3 }))}
            />
          )}
          {state.step === 5 && selectedPackage && availabilityCtx && !submitted && (
            <Step5Summary
              state={state}
              pkg={selectedPackage}
              settings={availabilityCtx.settings}
              onBack={() => setState((s) => ({ ...s, step: 4 }))}
              onSubmitted={() => setSubmitted(true)}
            />
          )}
          {state.step === 5 && (!availabilityCtx || !selectedPackage) && !submitted && (
            <div className="text-center py-10 text-muted">Bezig met laden...</div>
          )}
          {submitted && (
            <div className="text-center py-10">
              <h3 className="font-heading text-3xl text-gold-light mb-4">Offerte aangevraagd!</h3>
              <p className="text-prose text-lg max-w-md mx-auto leading-[1.7]">
                Bedankt, {state.fullName}. We nemen binnen enkele werkdagen contact met je op over jouw {state.eventType.toLowerCase()} op {state.eventDate}.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
