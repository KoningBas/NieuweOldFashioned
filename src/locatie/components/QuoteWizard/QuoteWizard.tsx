import { useEffect, useState } from 'react';
import { fetchFeaturedPackages } from '../../../shared/lib/data';
import type { ServicePackage } from '../../../shared/types/db';
import { StepIndicator } from './StepIndicator';
import { Step1Package } from './Step1Package';

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

  useEffect(() => {
    fetchFeaturedPackages().then(setPackages).catch((err) => {
      console.error('Failed to load featured packages', err);
      setPackages([]);
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
          {state.step > 1 && selectedPackage && (
            <div className="text-muted">Stap {state.step} van 5 &mdash; wordt in de volgende taken toegevoegd.</div>
          )}
        </div>
      </div>
    </section>
  );
}
