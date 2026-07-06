import { supabase } from './supabase';
import type { Availability, BlockedDate, CocktailMenuItem, QuoteRequest, ServicePackage, ServiceSettings } from '../types/db';

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

export async function fetchAvailabilityContext(): Promise<{
  availability: Availability[];
  blockedDates: BlockedDate[];
  confirmedRequests: QuoteRequest[];
}> {
  const [availabilityRes, blockedRes, confirmedRes] = await Promise.all([
    supabase.from('availability').select('*'),
    supabase.from('blocked_dates').select('*'),
    supabase.from('quote_requests').select('*').eq('status', 'confirmed'),
  ]);
  if (availabilityRes.error) throw availabilityRes.error;
  if (blockedRes.error) throw blockedRes.error;
  if (confirmedRes.error) throw confirmedRes.error;
  return {
    availability: availabilityRes.data ?? [],
    blockedDates: blockedRes.data ?? [],
    confirmedRequests: confirmedRes.data ?? [],
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
