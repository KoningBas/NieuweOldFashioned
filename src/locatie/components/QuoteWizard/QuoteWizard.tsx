import { useEffect, useState } from 'react';
import { fetchAvailabilityContext, fetchFeaturedPackages, fetchServiceSettings } from '../../../shared/lib/data';
import type { Availability, BlockedDate, ServicePackage, ServiceSettings } from '../../../shared/types/db';
import type { ConfirmedEventDate } from '../../../shared/lib/data';
import { StepIndicator } from './StepIndicator';
import { Step1Package } from './Step1Package';
import { Step2Counts } from './Step2Counts';
import { Step3DateLocation } from './Step3DateLocation';

export interface WizardState {
  step: number;
  packageId: string | null;
  eventType: string;
  guestCount: number;
  cocktailCount: number;
  eventDate: string;
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
  guestCount: 50,
  cocktailCount: 50,
  eventDate: '',
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
  const [availabilityCtx, setAvailabilityCtx] = useState<{
    availability: Availability[]; blockedDates: BlockedDate[]; settings: ServiceSettings; confirmedRequests: ConfirmedEventDate[];
  } | null>(null);

  useEffect(() => {
    fetchFeaturedPackages().then(setPackages).catch((err) => {
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
    <section id="offerte" className="py-28 px-6 md:px-10">
      <div className="max-w-4xl mx-auto">
        <p className="uppercase tracking-[0.3em] text-gold-light text-sm mb-4">Offerte aanvragen</p>
        <h2 className="font-heading text-4xl md:text-5xl tracking-[-0.02em] mb-12">Vraag direct een offerte aan</h2>

        <StepIndicator current={state.step} />

        <div className="rounded-2xl bg-surface-elevated border border-white/5 p-8 md:p-10 shadow-[0_25px_60px_-20px_rgba(0,0,0,0.6)]">
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
              eventCity={state.eventCity}
              eventPostcode={state.eventPostcode}
              distanceKm={state.distanceKm}
              availabilityCtx={availabilityCtx}
              onDateChange={(v) => setState((s) => ({ ...s, eventDate: v }))}
              onCityChange={(v) => setState((s) => ({ ...s, eventCity: v }))}
              onPostcodeChange={(v) => setState((s) => ({ ...s, eventPostcode: v }))}
              onDistanceChange={(v) => setState((s) => ({ ...s, distanceKm: v }))}
              onNext={() => setState((s) => ({ ...s, step: 4 }))}
              onBack={() => setState((s) => ({ ...s, step: 2 }))}
            />
          )}
          {state.step > 3 && selectedPackage && (
            <div className="text-muted">Stap {state.step} van 5 &mdash; wordt in de volgende taak toegevoegd.</div>
          )}
        </div>
      </div>
    </section>
  );
}
