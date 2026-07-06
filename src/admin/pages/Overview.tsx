import { useEffect, useState } from 'react';
import { supabase } from '../../shared/lib/supabase';
import { AdminLayout } from '../layout/AdminLayout';
import { MetricCard } from '../components/MetricCard';

interface Metrics {
  todayEvents: number;
  upcomingEvents: number;
  newRequests: number;
  confirmedRequests: number;
  activePackages: number;
  featuredCocktails: number;
}

export function Overview() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().slice(0, 10);

      const [todayRes, upcomingRes, newRes, confirmedRes, packagesRes, cocktailsRes] = await Promise.all([
        supabase.from('quote_requests').select('id', { count: 'exact', head: true }).eq('status', 'confirmed').eq('event_date', today),
        supabase.from('quote_requests').select('id', { count: 'exact', head: true }).eq('status', 'confirmed').gt('event_date', today),
        supabase.from('quote_requests').select('id', { count: 'exact', head: true }).eq('status', 'new'),
        supabase.from('quote_requests').select('id', { count: 'exact', head: true }).eq('status', 'confirmed'),
        supabase.from('service_packages').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('cocktail_menu').select('id', { count: 'exact', head: true }).eq('is_featured', true).eq('is_active', true),
      ]);

      setMetrics({
        todayEvents: todayRes.count ?? 0,
        upcomingEvents: upcomingRes.count ?? 0,
        newRequests: newRes.count ?? 0,
        confirmedRequests: confirmedRes.count ?? 0,
        activePackages: packagesRes.count ?? 0,
        featuredCocktails: cocktailsRes.count ?? 0,
      });
    }
    load().catch((err) => console.error('Failed to load overview metrics', err));
  }, []);

  return (
    <AdminLayout title="Overzicht">
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
          <MetricCard label="Vandaag" value={metrics.todayEvents} />
          <MetricCard label="Aankomend" value={metrics.upcomingEvents} />
          <MetricCard label="Nieuwe offertes" value={metrics.newRequests} />
          <MetricCard label="Bevestigd" value={metrics.confirmedRequests} />
          <MetricCard label="Actieve pakketten" value={metrics.activePackages} />
          <MetricCard label="Uitgelichte cocktails" value={metrics.featuredCocktails} />
        </div>
      )}
    </AdminLayout>
  );
}
