// Prefill logic for quote lines. The amount is always recomputed from the
// package and the counts — never taken from estimated_total, which arrives
// from the customer's browser and cannot be trusted for billing.

import type { QuoteRequest, ServicePackage, ServiceSettings } from '../types/db';

export interface PrefillLine {
  description: string;
  quantity: number;
  unit: string;
  unit_price_incl: number;
  vat_rate: number;
  sort_order: number;
}

type PrefillPackage = Pick<ServicePackage, 'package_name' | 'price' | 'price_unit'>;
type PrefillSettings = Pick<ServiceSettings, 'travel_fee_near' | 'travel_fee_far' | 'travel_near_km_limit' | 'vat_rate'>;
type PrefillRequest = Pick<QuoteRequest, 'guest_count' | 'cocktail_count' | 'distance_km' | 'arrangement'>;

export function prefillQuoteLines(request: PrefillRequest, pkg: PrefillPackage, settings: PrefillSettings): PrefillLine[] {
  const vat = settings.vat_rate;
  const lines: PrefillLine[] = [];

  if (pkg.price_unit === 'per_cocktail') {
    lines.push({
      description: pkg.package_name,
      quantity: request.cocktail_count,
      unit: 'cocktails',
      unit_price_incl: pkg.price,
      vat_rate: vat,
      sort_order: 0,
    });
  } else {
    lines.push({
      description: request.arrangement ? `${pkg.package_name} — ${request.arrangement}` : pkg.package_name,
      quantity: request.guest_count,
      unit: 'pers.',
      unit_price_incl: pkg.price,
      vat_rate: vat,
      sort_order: 0,
    });
  }

  if (request.distance_km > 0) {
    const near = request.distance_km <= settings.travel_near_km_limit;
    lines.push({
      description: `Reiskosten (${request.distance_km} km)`,
      quantity: 1,
      unit: 'st',
      unit_price_incl: near ? settings.travel_fee_near : settings.travel_fee_far,
      vat_rate: vat,
      sort_order: 1,
    });
  }

  return lines;
}
