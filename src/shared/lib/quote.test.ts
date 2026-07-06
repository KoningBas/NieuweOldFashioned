import { describe, it, expect } from 'vitest';
import { computeQuote, QuoteValidationError } from './quote';
import type { ServicePackage, ServiceSettings } from '../types/db';

const settings: ServiceSettings = {
  id: '1',
  business_name: 'The Old Fashioned',
  business_email: 'info@example.com',
  business_phone: '0612345678',
  business_address: 'Grotestraat 12, Rijssen',
  cocktail_price: 8,
  min_cocktails: 50,
  workshop_price_per_person: 32,
  travel_fee_near: 50,
  travel_fee_far: 75,
  travel_near_km_limit: 10,
  booking_notice_hours: 72,
  max_guests: 200,
  created_at: '2026-01-01',
};

const bartendingPkg: ServicePackage = {
  id: 'p1',
  package_name: 'Bartending op Locatie',
  description: '',
  price: 8,
  price_unit: 'per_cocktail',
  min_quantity: 50,
  category: 'bartending',
  is_featured: true,
  is_active: true,
  created_at: '2026-01-01',
};

const workshopPkg: ServicePackage = {
  ...bartendingPkg,
  id: 'p2',
  package_name: 'Workshop op Locatie',
  price: 32,
  price_unit: 'per_person',
  min_quantity: 4,
};

describe('computeQuote', () => {
  it('calculates per-cocktail subtotal with near travel fee', () => {
    const result = computeQuote(bartendingPkg, settings, { cocktailCount: 60, guestCount: 0, distanceKm: 5 });
    expect(result).toEqual({ subtotal: 480, travelFee: 50, total: 530 });
  });

  it('uses far travel fee beyond the near limit', () => {
    const result = computeQuote(bartendingPkg, settings, { cocktailCount: 50, guestCount: 0, distanceKm: 20 });
    expect(result.travelFee).toBe(75);
    expect(result.total).toBe(475);
  });

  it('rejects cocktail counts below the minimum', () => {
    expect(() =>
      computeQuote(bartendingPkg, settings, { cocktailCount: 10, guestCount: 0, distanceKm: 5 })
    ).toThrow(QuoteValidationError);
  });

  it('calculates per-person subtotal for workshop package', () => {
    const result = computeQuote(workshopPkg, settings, { cocktailCount: 0, guestCount: 10, distanceKm: 5 });
    expect(result).toEqual({ subtotal: 320, travelFee: 50, total: 370 });
  });

  it('rejects guest counts below workshop minimum', () => {
    expect(() =>
      computeQuote(workshopPkg, settings, { cocktailCount: 0, guestCount: 2, distanceKm: 5 })
    ).toThrow(QuoteValidationError);
  });
});
