export type PriceUnit = 'per_cocktail' | 'per_person';

export interface ServicePackage {
  id: string;
  package_name: string;
  description: string;
  price: number;
  price_unit: PriceUnit;
  min_quantity: number;
  category: string;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
}

export interface CocktailMenuItem {
  id: string;
  name: string;
  description: string;
  category: string;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
}

export type QuoteStatus = 'new' | 'reviewed' | 'quoted' | 'confirmed' | 'declined';

export interface QuoteRequest {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  event_type: string;
  guest_count: number;
  cocktail_count: number;
  package_id: string;
  event_date: string;
  event_time: string | null;
  event_city: string;
  event_postcode: string;
  distance_km: number;
  estimated_total: number;
  status: QuoteStatus;
  special_requests: string | null;
  created_at: string;
}

export interface Availability {
  id: string;
  weekday: number;
  is_available: boolean;
  start_time: string;
  end_time: string;
}

export interface BlockedDate {
  id: string;
  blocked_date: string;
  reason: string | null;
  created_at: string;
}

export interface ServiceSettings {
  id: string;
  business_name: string;
  business_email: string;
  business_phone: string;
  business_address: string;
  cocktail_price: number;
  min_cocktails: number;
  workshop_price_per_person: number;
  travel_fee_near: number;
  travel_fee_far: number;
  travel_near_km_limit: number;
  booking_notice_hours: number;
  max_guests: number;
  created_at: string;
}

export interface AdminUser {
  id: string;
  user_id: string;
  created_at: string;
}
