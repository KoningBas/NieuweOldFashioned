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

/** Full chain from intake to paid. 'confirmed' is the pre-migration name of
 *  'booked'; normalizeStatus() maps it so the UI keeps working against a
 *  database where migration 0003 has not run yet. */
export type QuoteStatus =
  | 'new'
  | 'reviewed'
  | 'quoted'
  | 'booked'
  | 'completed'
  | 'invoiced'
  | 'paid'
  | 'declined'
  | 'cancelled'
  | 'confirmed';

export type RequestSource = 'wizard_locatie' | 'wizard_workshop_locatie' | 'workshop_bar';

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
  source: RequestSource;
  event_address: string;
  arrangement: 'Bites' | 'Streetfood' | null;
  internal_notes: string | null;
  /** Set every time the cocktail selection is saved. Compared against
   *  packing_lists.generated_at to spot a packing list that has fallen behind. */
  cocktails_updated_at: string | null;
}

export type ActivityKind = 'system' | 'call' | 'email' | 'whatsapp' | 'note';

export interface QuoteActivity {
  id: string;
  request_id: string;
  kind: ActivityKind;
  body: string;
  created_at: string;
}

export type QuoteDocStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';

export interface Quote {
  id: string;
  request_id: string;
  quote_number: string;
  version: number;
  status: QuoteDocStatus;
  valid_until: string;
  total_incl: number;
  notes: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  created_at: string;
}

export interface QuoteLine {
  id: string;
  quote_id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price_incl: number;
  vat_rate: number;
  sort_order: number;
}

export interface Invoice {
  id: string;
  request_id: string;
  quote_id: string | null;
  invoice_number: string;
  issued_on: string;
  due_on: string;
  paid_on: string | null;
  total_incl: number;
  notes: string | null;
  created_at: string;
}

export interface InvoiceLine {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price_incl: number;
  vat_rate: number;
  sort_order: number;
}

export type PackingCategory =
  | 'sterke_drank'
  | 'mixers'
  | 'vers'
  | 'ijs'
  | 'glaswerk'
  | 'barmateriaal'
  | 'verbruik'
  | 'techniek';

export type Perishability = 'houdbaar' | 'vers' | 'diepvries';

export type ScaleBasis = 'fixed' | 'per_guest' | 'per_cocktail';

export interface PackingTemplate {
  id: string;
  package_id: string | null;
  name: string;
  created_at: string;
}

export interface PackingTemplateItem {
  id: string;
  template_id: string;
  name: string;
  category: PackingCategory;
  perishability: Perishability;
  unit: string;
  scale_basis: ScaleBasis;
  scale_factor: number;
  sort_order: number;
}

export interface PackingList {
  id: string;
  request_id: string;
  notes: string | null;
  generated_at: string | null;
  created_at: string;
}

export type PackingItemOrigin = 'template' | 'cocktails' | 'scaling' | 'manual';

export interface PackingListItem {
  id: string;
  list_id: string;
  name: string;
  category: PackingCategory;
  perishability: Perishability;
  quantity: number;
  unit: string;
  is_checked: boolean;
  origin: PackingItemOrigin;
  sort_order: number;
}

export interface CocktailIngredient {
  id: string;
  cocktail_id: string;
  name: string;
  amount: number;
  unit: 'ml' | 'cl' | 'g' | 'st';
  category: PackingCategory;
  perishability: Perishability;
  pack_size: number | null;
  pack_unit: string | null;
  sort_order: number;
}

export interface RequestCocktail {
  id: string;
  request_id: string;
  cocktail_id: string;
  planned_count: number;
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
  kvk_number: string;
  vat_number: string;
  iban: string;
  quote_valid_days: number;
  invoice_due_days: number;
  vat_rate: number;
  nudge_new_days: number;
  nudge_quote_days: number;
}

export interface AdminUser {
  id: string;
  user_id: string;
  created_at: string;
}
