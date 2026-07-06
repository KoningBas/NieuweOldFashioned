import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../../shared/lib/supabase';
import { AdminLayout } from '../layout/AdminLayout';
import type { BlockedDate } from '../../shared/types/db';

export function BlockedDates() {
  const [dates, setDates] = useState<BlockedDate[]>([]);
  const [newDate, setNewDate] = useState('');
  const [newReason, setNewReason] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data, error } = await supabase.from('blocked_dates').select('*').order('blocked_date', { ascending: true });
    if (error) { console.error('Failed to load blocked dates', error); return; }
    setDates(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!newDate) return;
    const { error } = await supabase.from('blocked_dates').insert({ blocked_date: newDate, reason: newReason || null });
    if (error) { console.error('Failed to add blocked date', error); return; }
    setNewDate('');
    setNewReason('');
    load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from('blocked_dates').delete().eq('id', id);
    if (error) { console.error('Failed to remove blocked date', error); return; }
    load();
  }

  return (
    <AdminLayout title="Geblokkeerde data">
      <form onSubmit={add} className="flex gap-4 mb-8 items-end flex-wrap">
        <label className="block">
          <span className="block text-base text-muted mb-2">Datum</span>
          <input type="date" required value={newDate} onChange={(e) => setNewDate(e.target.value)} className="rounded-lg bg-surface border border-white/15 px-4 py-2.5 text-base text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light" />
        </label>
        <label className="block flex-1 min-w-[200px]">
          <span className="block text-base text-muted mb-2">Reden (optioneel)</span>
          <input value={newReason} onChange={(e) => setNewReason(e.target.value)} className="w-full rounded-lg bg-surface border border-white/15 px-4 py-2.5 text-base text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light" />
        </label>
        <button type="submit" className="rounded-full px-6 py-3 text-base bg-gradient-to-b from-gold-light to-primary-dark text-surface font-medium hover:-translate-y-0.5 active:translate-y-0 transition-transform duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2">
          Toevoegen
        </button>
      </form>

      {loading ? (
        <div className="rounded-xl border border-white/5 bg-surface-elevated p-10 text-center text-muted text-lg">Laden...</div>
      ) : dates.length === 0 ? (
        <div className="rounded-xl border border-white/5 bg-surface-elevated p-10 text-center text-muted text-lg">Geen geblokkeerde data.</div>
      ) : (
        <div className="rounded-xl border border-white/5 bg-surface-elevated divide-y divide-white/5">
          {dates.map((d) => (
            <div key={d.id} className="flex items-center justify-between p-5">
              <div>
                <span className="font-heading text-lg">{d.blocked_date}</span>
                {d.reason && <span className="text-muted ml-4 text-base">{d.reason}</span>}
              </div>
              <button onClick={() => remove(d.id)} className="text-base text-red-300/90 hover:text-red-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2 rounded">Verwijderen</button>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
