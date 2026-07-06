import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '../../shared/lib/supabase';
import { AdminLayout } from '../layout/AdminLayout';
import { Drawer } from '../components/Drawer';
import { formatDateLongNL, formatEuro, toDateOnly } from '../../shared/lib/format';

// Only the columns the agenda needs; PII stays out of wider fetches.
interface Job {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  event_type: string;
  guest_count: number;
  cocktail_count: number;
  package_id: string;
  event_date: string;
  event_city: string;
  estimated_total: number;
  special_requests: string | null;
}

interface PackageInfo {
  name: string;
  category: string;
}

type View = 'week' | 'month';

const WEEKDAY_SHORT = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
const MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

// Job-type visual meta, keyed by service_packages.category.
function typeMeta(category: string): { label: string; dot: string; chip: string } {
  if (category === 'workshop') return { label: 'Workshop', dot: 'bg-emerald-400', chip: 'bg-emerald-500/12 text-emerald-300 border-emerald-500/25' };
  if (category === 'bartending') return { label: 'Bartending', dot: 'bg-gold', chip: 'bg-gold/12 text-gold-light border-gold/25' };
  return { label: 'Op locatie', dot: 'bg-white/50', chip: 'bg-white/8 text-white/80 border-white/15' };
}

function startOfWeekMonday(date: Date): Date {
  const offset = (date.getDay() + 6) % 7; // days since Monday
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function Agenda() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [packages, setPackages] = useState<Record<string, PackageInfo>>({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('week');
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [jobRes, pkgRes] = await Promise.all([
        supabase
          .from('quote_requests')
          .select('id, full_name, email, phone, event_type, guest_count, cocktail_count, package_id, event_date, event_city, estimated_total, special_requests')
          .eq('status', 'confirmed'),
        supabase.from('service_packages').select('id, package_name, category'),
      ]);
      if (jobRes.error) { console.error('Failed to load agenda', jobRes.error); setLoading(false); return; }
      if (pkgRes.error) { console.error('Failed to load packages', pkgRes.error); }
      setJobs((jobRes.data as Job[]) ?? []);
      setPackages(Object.fromEntries((pkgRes.data ?? []).map((p) => [p.id, { name: p.package_name, category: p.category }])));
      setLoading(false);
    }
    load();
  }, []);

  // Group confirmed jobs by their event_date string for O(1) day lookup.
  const jobsByDate = useMemo(() => {
    const map = new Map<string, Job[]>();
    for (const j of jobs) {
      const list = map.get(j.event_date) ?? [];
      list.push(j);
      map.set(j.event_date, list);
    }
    return map;
  }, [jobs]);

  const todayStr = toDateOnly(new Date());
  const pkgOf = (id: string): PackageInfo => packages[id] ?? { name: 'Onbekend pakket', category: '' };

  function shift(delta: number) {
    setAnchor((a) => (view === 'week' ? addDays(a, delta * 7) : new Date(a.getFullYear(), a.getMonth() + delta, 1)));
  }

  const weekStart = startOfWeekMonday(anchor);
  const rangeLabel = view === 'week'
    ? `${weekStart.getDate()} ${MONTHS[weekStart.getMonth()].slice(0, 3)} – ${addDays(weekStart, 6).getDate()} ${MONTHS[addDays(weekStart, 6).getMonth()].slice(0, 3)} ${addDays(weekStart, 6).getFullYear()}`
    : `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`;

  const selectedJobs = selectedDate ? jobsByDate.get(selectedDate) ?? [] : [];

  return (
    <AdminLayout title="Agenda">
      {/* Toolbar: view toggle + range navigation */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="inline-flex gap-1 rounded-xl border border-white/10 bg-surface-elevated p-1">
          {(['week', 'month'] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-lg px-4 py-2 text-base transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2 ${
                view === v ? 'bg-gold text-surface' : 'text-muted hover:text-white'
              }`}
            >
              {v === 'week' ? 'Week' : 'Maand'}
            </button>
          ))}
        </div>

        <div className="inline-flex items-center gap-2">
          <NavBtn label="Vorige" onClick={() => shift(-1)}>‹</NavBtn>
          <NavBtn label="Volgende" onClick={() => shift(1)}>›</NavBtn>
          <button
            onClick={() => setAnchor(new Date())}
            className="rounded-lg border border-white/15 px-4 py-2 text-base text-muted transition-colors hover:text-white hover:border-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
          >
            Vandaag
          </button>
        </div>

        <span className="font-heading text-xl text-white first-letter:uppercase ml-auto">{rangeLabel}</span>
      </div>

      {loading ? (
        <div className="rounded-xl border border-white/5 bg-surface-elevated p-10 text-center text-muted text-lg">Laden...</div>
      ) : view === 'week' ? (
        <WeekView weekStart={weekStart} todayStr={todayStr} jobsByDate={jobsByDate} pkgOf={pkgOf} onSelect={setSelectedDate} />
      ) : (
        <MonthView anchor={anchor} todayStr={todayStr} jobsByDate={jobsByDate} pkgOf={pkgOf} onSelect={setSelectedDate} />
      )}

      <Drawer open={selectedDate !== null} title={selectedDate ? capitalize(formatDateLongNL(selectedDate)) : ''} onClose={() => setSelectedDate(null)}>
        {selectedJobs.length === 0 ? (
          <p className="text-base text-muted">Geen klussen op deze dag.</p>
        ) : (
          <div className="flex flex-col gap-6">
            {selectedJobs.map((j) => {
              const meta = typeMeta(pkgOf(j.package_id).category);
              return (
                <div key={j.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="font-heading text-xl text-white">{j.full_name}</h3>
                    <span className={`rounded-full border px-3 py-1 text-sm ${meta.chip}`}>{meta.label}</span>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-5 gap-y-4">
                    <DetailRow label="Plaats" value={j.event_city} />
                    <DetailRow label="Evenement" value={j.event_type} />
                    <DetailRow label="Gasten" value={String(j.guest_count)} />
                    <DetailRow label="Cocktails" value={String(j.cocktail_count)} />
                    <DetailRow label="Pakket" value={pkgOf(j.package_id).name} />
                    <DetailRow label="Totaal" value={formatEuro(j.estimated_total)} accent />
                  </dl>
                  <div className="mt-4 border-t border-white/5 pt-4">
                    <div className="text-xs uppercase tracking-widest text-muted mb-2">Contact</div>
                    <a href={`mailto:${j.email}`} className="block text-base text-white hover:text-gold-light transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light rounded">{j.email}</a>
                    {j.phone && <a href={`tel:${j.phone}`} className="block text-base text-white hover:text-gold-light transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light rounded">{j.phone}</a>}
                  </div>
                  {j.special_requests && (
                    <div className="mt-4 border-t border-white/5 pt-4">
                      <div className="text-xs uppercase tracking-widest text-muted mb-2">Bijzondere verzoeken</div>
                      <p className="text-base leading-relaxed text-white/80">{j.special_requests}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Drawer>
    </AdminLayout>
  );
}

interface ViewProps {
  todayStr: string;
  jobsByDate: Map<string, Job[]>;
  pkgOf: (id: string) => PackageInfo;
  onSelect: (date: string) => void;
}

function WeekView({ weekStart, todayStr, jobsByDate, pkgOf, onSelect }: ViewProps & { weekStart: Date }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7 lg:gap-2">
      {days.map((day, i) => {
        const dateStr = toDateOnly(day);
        const dayJobs = jobsByDate.get(dateStr) ?? [];
        const isToday = dateStr === todayStr;
        return (
          <button
            key={dateStr}
            onClick={() => onSelect(dateStr)}
            className={`flex min-h-[9rem] flex-col rounded-xl border p-3 text-left transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2 ${
              isToday ? 'border-gold/40 bg-gold/[0.06]' : 'border-white/5 bg-surface-elevated hover:border-white/10'
            }`}
          >
            <div className="mb-2 flex items-baseline justify-between">
              <span className={`text-sm uppercase tracking-wide ${isToday ? 'text-gold-light' : 'text-muted'}`}>{WEEKDAY_SHORT[i]}</span>
              <span className={`font-heading text-lg ${isToday ? 'text-gold-light' : 'text-white'}`}>{day.getDate()}</span>
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              {dayJobs.length === 0 ? (
                <span className="mt-auto text-sm text-muted/50">—</span>
              ) : (
                dayJobs.map((j) => {
                  const meta = typeMeta(pkgOf(j.package_id).category);
                  return (
                    <div key={j.id} className={`rounded-lg border px-2.5 py-2 ${meta.chip}`}>
                      <div className="flex items-center gap-1.5 text-sm font-medium">
                        <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                        {meta.label}
                      </div>
                      <div className="mt-0.5 truncate text-sm text-white/85">{j.event_city}</div>
                      <div className="text-xs text-muted">{j.guest_count} gasten</div>
                    </div>
                  );
                })
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function MonthView({ anchor, todayStr, jobsByDate, pkgOf, onSelect }: ViewProps & { anchor: Date }) {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - offset);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks = Math.ceil((offset + daysInMonth) / 7);
  const cells = Array.from({ length: weeks * 7 }, (_, i) => addDays(gridStart, i));

  return (
    <div className="overflow-hidden rounded-xl border border-white/5 bg-surface-elevated">
      <div className="grid grid-cols-7 border-b border-white/5">
        {WEEKDAY_SHORT.map((d) => (
          <div key={d} className="px-3 py-2.5 text-center text-sm uppercase tracking-wide text-muted">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          const dateStr = toDateOnly(day);
          const inMonth = day.getMonth() === month;
          const dayJobs = jobsByDate.get(dateStr) ?? [];
          const isToday = dateStr === todayStr;
          return (
            <button
              key={i}
              onClick={() => onSelect(dateStr)}
              disabled={dayJobs.length === 0 && !inMonth}
              className={`relative flex min-h-[5.5rem] flex-col border-b border-r border-white/5 p-2 text-left transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:-outline-offset-2 [&:nth-child(7n)]:border-r-0 ${
                inMonth ? 'hover:bg-white/[0.03]' : 'bg-black/20'
              } ${dayJobs.length ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <span
                className={`mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-sm ${
                  isToday ? 'bg-gold text-surface font-medium' : inMonth ? 'text-white' : 'text-muted/50'
                }`}
              >
                {day.getDate()}
              </span>
              <div className="flex flex-wrap gap-1">
                {dayJobs.slice(0, 4).map((j) => (
                  <span key={j.id} className={`h-2 w-2 rounded-full ${typeMeta(pkgOf(j.package_id).category).dot}`} title={`${j.event_city} · ${j.full_name}`} />
                ))}
                {dayJobs.length > 4 && <span className="text-xs text-muted">+{dayJobs.length - 4}</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NavBtn({ children, label, onClick }: { children: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 text-xl leading-none text-muted transition-colors hover:text-white hover:border-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
    >
      {children}
    </button>
  );
}

function DetailRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-widest text-muted mb-1">{label}</dt>
      <dd className={accent ? 'font-heading text-xl text-gold-light' : 'text-base text-white'}>{value}</dd>
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
