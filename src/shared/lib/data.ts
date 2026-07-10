import { supabase } from './supabase';
import type { Availability, BlockedDate, CocktailMenuItem, ServicePackage, ServiceSettings } from '../types/db';

export async function fetchFeaturedPackages(): Promise<ServicePackage[]> {
  const { data, error } = await supabase
    .from('service_packages')
    .select('*')
    .eq('is_active', true)
    .eq('is_featured', true)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchFeaturedCocktails(): Promise<CocktailMenuItem[]> {
  const { data, error } = await supabase
    .from('cocktail_menu')
    .select('*')
    .eq('is_active', true)
    .eq('is_featured', true)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchServiceSettings(): Promise<ServiceSettings> {
  const { data, error } = await supabase.from('service_settings').select('*').limit(1).single();
  if (error) throw error;
  return data;
}

// Minimal shape isDateSelectable() (src/shared/lib/availability.ts) needs to
// run its "one event per day" double-booking check: it only ever reads
// `.status` and `.event_date` off each entry. We deliberately do NOT fetch
// full QuoteRequest rows (full_name, email, phone, special_requests, ...) for
// the public availability check — quote_requests has no public select policy
// (see supabase/migrations/0001_init.sql), only a narrow view exposing
// confirmed event dates. `status` is synthesized as a literal here since
// every row the view returns is, by definition, already confirmed.
export interface ConfirmedEventDate {
  status: 'confirmed';
  event_date: string;
}

export async function fetchAvailabilityContext(): Promise<{
  availability: Availability[];
  blockedDates: BlockedDate[];
  confirmedRequests: ConfirmedEventDate[];
}> {
  const [availabilityRes, blockedRes, confirmedRes] = await Promise.all([
    supabase.from('availability').select('*'),
    supabase.from('blocked_dates').select('*'),
    supabase.from('public_confirmed_event_dates').select('event_date'),
  ]);
  if (availabilityRes.error) throw availabilityRes.error;
  if (blockedRes.error) throw blockedRes.error;
  if (confirmedRes.error) throw confirmedRes.error;
  return {
    availability: availabilityRes.data ?? [],
    blockedDates: blockedRes.data ?? [],
    confirmedRequests: (confirmedRes.data ?? []).map((r: { event_date: string }) => ({
      status: 'confirmed' as const,
      event_date: r.event_date,
    })),
  };
}

export interface NewQuoteRequest {
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
  special_requests: string | null;
}

export async function submitQuoteRequest(payload: NewQuoteRequest): Promise<void> {
  const { error } = await supabase.from('quote_requests').insert({ ...payload, status: 'new' });
  if (error) throw error;
}
