import { useEffect, useState } from 'react';
import { supabase } from '../../shared/lib/supabase';
import { AdminLayout } from '../layout/AdminLayout';
import type { Availability as AvailabilityRow } from '../../shared/types/db';

const WEEKDAY_LABELS = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];

export function Availability() {
  const [rows, setRows] = useState<AvailabilityRow[]>([]);

  async function load() {
    const { data, error } = await supabase.from('availability').select('*').order('weekday', { ascending: true });
    if (error) { console.error('Failed to load availability', error); return; }
    setRows(data ?? []);
  }

  useEffect(() => { load(); }, []);

  async function update(row: AvailabilityRow, patch: Partial<AvailabilityRow>) {
    const { error } = await supabase.from('availability').update(patch).eq('id', row.id);
    if (error) { console.error('Failed to update availability', error); return; }
    setRows((current) => current.map((r) => (r.id === row.id ? { ...r, ...patch } : r)));
  }

  return (
    <AdminLayout title="Beschikbaarheid">
      <div className="rounded-xl border border-white/5 bg-surface-elevated divide-y divide-white/5">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center gap-6 p-5 flex-wrap">
            <span className="w-28 font-heading">{WEEKDAY_LABELS[row.weekday]}</span>
            <button
              onClick={() => update(row, { is_available: !row.is_available })}
              className={`rounded-full px-4 py-1.5 text-sm border focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2 ${row.is_available ? 'border-emerald-500/40 text-emerald-300' : 'border-white/15 text-muted'}`}
            >
              {row.is_available ? 'Beschikbaar' : 'Niet beschikbaar'}
            </button>
            <label className="flex items-center gap-2 text-sm text-muted">
              Van
              <input type="time" value={row.start_time.slice(0, 5)} onChange={(e) => update(row, { start_time: e.target.value })} className="bg-surface border border-white/15 rounded-lg px-2 py-1 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light" />
            </label>
            <label className="flex items-center gap-2 text-sm text-muted">
              Tot
              <input type="time" value={row.end_time.slice(0, 5)} onChange={(e) => update(row, { end_time: e.target.value })} className="bg-surface border border-white/15 rounded-lg px-2 py-1 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light" />
            </label>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
