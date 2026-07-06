import type { ServicePackage, ServiceSettings } from '../types/db';

export interface QuoteInput {
  cocktailCount: number;
  guestCount: number;
  distanceKm: number;
}

export interface QuoteBreakdown {
  subtotal: number;
  travelFee: number;
  total: number;
}

export class QuoteValidationError extends Error {}

export function computeQuote(pkg: ServicePackage, settings: ServiceSettings, input: QuoteInput): QuoteBreakdown {
  let subtotal: number;

  if (pkg.price_unit === 'per_cocktail') {
    const minRequired = Math.max(settings.min_cocktails, pkg.min_quantity);
    if (input.cocktailCount < minRequired) {
      throw new QuoteValidationError(`Minimaal ${minRequired} cocktails vereist voor dit pakket.`);
    }
    subtotal = settings.cocktail_price * input.cocktailCount;
  } else {
    if (input.guestCount < pkg.min_quantity) {
      throw new QuoteValidationError(`Minimaal ${pkg.min_quantity} gasten vereist voor dit pakket.`);
    }
    subtotal = settings.workshop_price_per_person * input.guestCount;
  }

  const travelFee = input.distanceKm <= settings.travel_near_km_limit ? settings.travel_fee_near : settings.travel_fee_far;

  return { subtotal, travelFee, total: subtotal + travelFee };
}
