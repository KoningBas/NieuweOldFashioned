import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../../shared/lib/supabase';
import { AdminLayout } from '../layout/AdminLayout';
import type { ServiceSettings as Settings } from '../../shared/types/db';

export function ServiceSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.from('service_settings').select('*').limit(1).single().then(({ data, error }) => {
      if (error) { console.error('Failed to load service settings', error); return; }
      setSettings(data);
    });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;
    const { error } = await supabase.from('service_settings').update(settings).eq('id', settings.id);
    if (error) { console.error('Failed to save service settings', error); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!settings) return <AdminLayout title="Instellingen"><div className="text-muted">Laden...</div></AdminLayout>;

  function field(key: keyof Settings, label: string, type: 'text' | 'number' = 'text') {
    return (
      <label className="block">
        <span className="block text-sm text-muted mb-2">{label}</span>
        <input
          type={type}
          value={settings![key] as string | number}
          onChange={(e) => setSettings((s) => (s ? { ...s, [key]: type === 'number' ? Number(e.target.value) : e.target.value } : s))}
          className="w-full rounded-lg bg-surface border border-white/15 px-4 py-2.5 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light"
        />
      </label>
    );
  }

  return (
    <AdminLayout title="Instellingen">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
        {field('business_name', 'Bedrijfsnaam')}
        {field('business_email', 'E-mailadres')}
        {field('business_phone', 'Telefoonnummer')}
        {field('business_address', 'Adres')}
        {field('cocktail_price', 'Prijs per cocktail (€)', 'number')}
        {field('min_cocktails', 'Minimum aantal cocktails', 'number')}
        {field('workshop_price_per_person', 'Workshopprijs per persoon (€)', 'number')}
        {field('travel_fee_near', 'Voorrijkosten dichtbij (€)', 'number')}
        {field('travel_fee_far', 'Voorrijkosten veraf (€)', 'number')}
        {field('travel_near_km_limit', 'Grens dichtbij (km)', 'number')}
        {field('booking_notice_hours', 'Minimale aanvraagtermijn (uur)', 'number')}
        {field('max_guests', 'Maximaal aantal gasten', 'number')}

        <div className="md:col-span-2 flex items-center gap-4">
          <button type="submit" className="rounded-full px-6 py-3 bg-gradient-to-b from-gold-light to-primary-dark text-surface font-medium hover:-translate-y-0.5 active:translate-y-0 transition-transform duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2">
            Opslaan
          </button>
          {saved && <span className="text-emerald-300 text-sm" role="status">Opgeslagen</span>}
        </div>
      </form>
    </AdminLayout>
  );
}
