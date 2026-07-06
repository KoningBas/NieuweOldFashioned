import { useEffect, useState } from 'react';
import { supabase } from '../../shared/lib/supabase';
import { AdminLayout } from '../layout/AdminLayout';
import { Badge } from '../components/Badge';
import type { QuoteRequest, QuoteStatus } from '../../shared/types/db';

const STATUSES: QuoteStatus[] = ['new', 'reviewed', 'quoted', 'confirmed', 'declined'];

export function QuoteRequests() {
  const [requests, setRequests] = useState<QuoteRequest[]>([]);
  const [filter, setFilter] = useState<QuoteStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data, error } = await supabase.from('quote_requests').select('*').order('created_at', { ascending: false });
    if (error) { console.error('Failed to load quote requests', error); return; }
    setRequests(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function updateStatus(id: string, status: QuoteStatus) {
    const { error } = await supabase.from('quote_requests').update({ status }).eq('id', id);
    if (error) { console.error('Failed to update quote request status', error); return; }
    setRequests((rows) => rows.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  const visible = filter === 'all' ? requests : requests.filter((r) => r.status === filter);

  return (
    <AdminLayout title="Offerteaanvragen">
      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setFilter('all')} className={`rounded-full px-4 py-2.5 text-base border transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2 ${filter === 'all' ? 'bg-gold text-surface border-gold' : 'border-white/15 text-muted hover:text-white'}`}>Alle</button>
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded-full px-4 py-2.5 text-base border transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2 ${filter === s ? 'bg-gold text-surface border-gold' : 'border-white/15 text-muted hover:text-white'}`}>{s}</button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-xl border border-white/5 bg-surface-elevated p-10 text-center text-muted text-lg">Laden...</div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-white/5 bg-surface-elevated p-10 text-center text-muted text-lg">Geen offerteaanvragen gevonden.</div>
      ) : (
        <div className="rounded-xl border border-white/5 bg-surface-elevated overflow-x-auto">
          <table className="w-full text-base">
            <thead>
              <tr className="text-left text-muted uppercase tracking-widest text-sm border-b border-white/5">
                <th className="p-5">Naam</th>
                <th className="p-5">Evenement</th>
                <th className="p-5">Datum</th>
                <th className="p-5">Plaats</th>
                <th className="p-5">Gasten</th>
                <th className="p-5">Cocktails</th>
                <th className="p-5">Totaal</th>
                <th className="p-5">Contact</th>
                <th className="p-5">Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="p-5">{r.full_name}</td>
                  <td className="p-5">{r.event_type}</td>
                  <td className="p-5">{r.event_date}</td>
                  <td className="p-5">{r.event_city}</td>
                  <td className="p-5">{r.guest_count}</td>
                  <td className="p-5">{r.cocktail_count}</td>
                  <td className="p-5">&euro;{r.estimated_total}</td>
                  <td className="p-5">{r.email}<br />{r.phone}</td>
                  <td className="p-5">
                    <select
                      value={r.status}
                      onChange={(e) => updateStatus(r.id, e.target.value as QuoteStatus)}
                      className="bg-surface border border-white/15 rounded-lg px-3 py-2 text-base text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <div className="mt-2"><Badge status={r.status} /></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
