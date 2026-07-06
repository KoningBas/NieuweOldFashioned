import { useEffect, useState } from 'react';
import { supabase } from '../../shared/lib/supabase';
import { AdminLayout } from '../layout/AdminLayout';
import type { Availability as AvailabilityRow } from '../../shared/types/db';

const WEEKDAY_LABELS = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];
// Display Monday-first (NL convention); DB stores weekday 0=Sunday..6=Saturday.
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function Availability() {
  const [rows, setRows] = useState<AvailabilityRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data, error } = await supabase.from('availability').select('*').order('weekday', { ascending: true });
    if (error) { console.error('Failed to load availability', error); setLoading(false); return; }
    setRows(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function update(row: AvailabilityRow, patch: Partial<AvailabilityRow>) {
    const previous = rows;
    setRows((current) => current.map((r) => (r.id === row.id ? { ...r, ...patch } : r)));
    const { error } = await supabase.from('availability').update(patch).eq('id', row.id);
    if (error) { console.error('Failed to update availability', error); setRows(previous); }
  }

  const ordered = DISPLAY_ORDER
    .map((wd) => rows.find((r) => r.weekday === wd))
    .filter((r): r is AvailabilityRow => Boolean(r));

  return (
    <AdminLayout title="Openingstijden">
      <p className="mb-6 max-w-2xl text-base text-muted">
        Zet dagen open of gesloten en stel per open dag de starttijd in. Wijzigingen zijn direct
        zichtbaar op de website.
      </p>

      {loading ? (
        <div className="rounded-xl border border-white/5 bg-surface-elevated p-10 text-center text-muted text-lg">Laden...</div>
      ) : (
        <div className="max-w-3xl overflow-hidden rounded-xl border border-white/5 bg-surface-elevated divide-y divide-white/5">
          {ordered.map((row) => {
            const open = row.is_available;
            return (
              <div
                key={row.id}
                className={`flex flex-wrap items-center gap-x-6 gap-y-4 px-6 py-5 transition-colors ${open ? '' : 'bg-black/20'}`}
              >
                <span className={`w-28 font-heading text-lg ${open ? 'text-white' : 'text-muted'}`}>{WEEKDAY_LABELS[row.weekday]}</span>

                <Toggle
                  checked={open}
                  onChange={() => update(row, { is_available: !open })}
                  label={`${WEEKDAY_LABELS[row.weekday]} ${open ? 'sluiten' : 'openen'}`}
                />

                {open ? (
                  <div className="flex flex-wrap items-center gap-4 text-base">
                    <TimeField
                      label="Van"
                      value={row.start_time.slice(0, 5)}
                      onChange={(v) => update(row, { start_time: v })}
                    />
                    <span className="text-muted">–</span>
                    <TimeField
                      label="Tot"
                      value={row.end_time.slice(0, 5)}
                      onChange={(v) => update(row, { end_time: v })}
                    />
                  </div>
                ) : (
                  <span className="text-base uppercase tracking-widest text-muted">Gesloten</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2 ${
        checked ? 'bg-emerald-500/30 border-emerald-500/50' : 'bg-white/5 border-white/15'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-6 bg-emerald-300' : 'translate-x-1 bg-muted'
        }`}
      />
    </button>
  );
}

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex items-center gap-2 text-muted">
      {label}
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-white/15 bg-surface px-3 py-1.5 text-white transition-colors hover:border-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light [color-scheme:dark]"
      />
    </label>
  );
}
