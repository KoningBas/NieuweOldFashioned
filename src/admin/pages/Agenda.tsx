import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../shared/lib/supabase';
import { AdminLayout } from '../layout/AdminLayout';
import { Drawer } from '../components/Drawer';
import { formatDateLongNL, formatEuro, toDateOnly } from '../../shared/lib/format';
import { normalizeStatus } from '../../shared/lib/workflow';
import { IconBlock } from '../components/icons';
import type { BlockedDate, QuoteStatus } from '../../shared/types/db';

// Only the columns the agenda needs; PII stays out of wider fetches.
interface AgendaRequest {
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
  estimated_total: number;
  special_requests: string | null;
  status: QuoteStatus;
}

/** The four appearances from the design doc. */
type ItemKind = 'geboekt' | 'offerte' | 'aanvraag';

function kindOf(status: QuoteStatus): ItemKind | null {
  const s = normalizeStatus(status);
  if (['booked', 'completed', 'invoiced', 'paid'].includes(s)) return 'geboekt';
  if (s === 'quoted') return 'offerte';
  if (s === 'new' || s === 'reviewed') return 'aanvraag';
  return null;
}

const KIND_META: Record<ItemKind, { label: string; chip: string; dot: string }> = {
  // Filled gold: the day is yours. Outline: promised, not yet booked. Dot: a lead.
  geboekt: { label: 'Geboekt', chip: 'border-gold bg-gold/20 text-gold-light', dot: 'bg-gold' },
  offerte: { label: 'Offerte open', chip: 'border-gold/40 border-dashed bg-transparent text-gold-light/90', dot: 'bg-transparent border border-gold/70' },
  aanvraag: { label: 'Aanvraag', chip: 'border-white/15 bg-white/5 text-white/75', dot: 'bg-white/50' },
};

const WEEKDAY_SHORT = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
const MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

function startOfWeekMonday(date: Date): Date {
  const offset = (date.getDay() + 6) % 7;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset);
}
function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

type View = 'month' | 'week';

export function Agenda() {
  const [requests, setRequests] = useState<AgendaRequest[]>([]);
  const [blocked, setBlocked] = useState<BlockedDate[]>([]);
  const [packageNames, setPackageNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('month');
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState('');

  useEffect(() => {
    async function load() {
      const [reqRes, blockRes, pkgRes] = await Promise.all([
        supabase
          .from('quote_requests')
          .select('id, full_name, email, phone, event_type, guest_count, cocktail_count, package_id, event_date, event_time, event_city, estimated_total, special_requests, status'),
        supabase.from('blocked_dates').select('*'),
        supabase.from('service_packages').select('id, package_name'),
      ]);
      if (reqRes.error) { console.error('Failed to load agenda', reqRes.error); setLoading(false); return; }
      setRequests((reqRes.data as AgendaRequest[]) ?? []);
      setBlocked(blockRes.data ?? []);
      setPackageNames(Object.fromEntries((pkgRes.data ?? []).map((p) => [p.id, p.package_name])));
      setLoading(false);
    }
    load();
  }, []);

  const byDate = useMemo(() => {
    const map = new Map<string, AgendaRequest[]>();
    for (const r of requests) {
      if (!kindOf(r.status)) continue;
      const list = map.get(r.event_date) ?? [];
      list.push(r);
      map.set(r.event_date, list);
    }
    // Booked first within a day.
    const rank: Record<ItemKind, number> = { geboekt: 0, offerte: 1, aanvraag: 2 };
    for (const list of map.values()) list.sort((a, b) => rank[kindOf(a.status)!] - rank[kindOf(b.status)!]);
    return map;
  }, [requests]);

  const blockedByDate = useMemo(() => new Map(blocked.map((b) => [b.blocked_date, b])), [blocked]);

  const todayStr = toDateOnly(new Date());

  function shift(delta: number) {
    setAnchor((a) => (view === 'week' ? addDays(a, delta * 7) : new Date(a.getFullYear(), a.getMonth() + delta, 1)));
  }

  async function blockDay(dateStr: string) {
    const { data, error } = await supabase.from('blocked_dates')
      .insert({ blocked_date: dateStr, reason: blockReason.trim() || null })
      .select().single();
    if (error) { console.error('Failed to block date', error); return; }
    setBlocked((prev) => [...prev, data]);
    setBlockReason('');
  }

  async function unblockDay(entry: BlockedDate) {
    setBlocked((prev) => prev.filter((b) => b.id !== entry.id));
    const { error } = await supabase.from('blocked_dates').delete().eq('id', entry.id);
    if (error) { console.error('Failed to unblock date', error); setBlocked((prev) => [...prev, entry]); }
  }

  const weekStart = startOfWeekMonday(anchor);
  const rangeLabel = view === 'week'
    ? `${weekStart.getDate()} ${MONTHS[weekStart.getMonth()].slice(0, 3)} – ${addDays(weekStart, 6).getDate()} ${MONTHS[addDays(weekStart, 6).getMonth()].slice(0, 3)} ${addDays(weekStart, 6).getFullYear()}`
    : `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`;

  const selectedItems = selectedDate ? byDate.get(selectedDate) ?? [] : [];
  const selectedBlock = selectedDate ? blockedByDate.get(selectedDate) : undefined;

  return (
    <AdminLayout title="Agenda">
      {/* Toolbar */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="inline-flex gap-1 rounded-xl border border-white/10 bg-surface-elevated p-1" role="tablist" aria-label="Weergave">
          {(['month', 'week'] as View[]).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`h-10 rounded-lg px-4 text-[0.9375rem] transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2 ${
                view === v ? 'bg-gold font-medium text-surface' : 'text-muted hover:text-white'
              }`}
            >
              {v === 'month' ? 'Maand' : 'Week'}
            </button>
          ))}
        </div>
        <div className="inline-flex items-center gap-2">
          <NavBtn label="Vorige" onClick={() => shift(-1)}>‹</NavBtn>
          <NavBtn label="Volgende" onClick={() => shift(1)}>›</NavBtn>
          <button
            onClick={() => setAnchor(new Date())}
            className="h-10 rounded-lg border border-white/15 px-4 text-[0.9375rem] text-muted transition-colors hover:border-white/25 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
          >
            Vandaag
          </button>
        </div>
        <span className="ml-auto font-heading text-xl text-white first-letter:uppercase">{rangeLabel}</span>
      </div>

      {/* Legend — colour never carries meaning alone */}
      <div className="mb-4 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted" aria-hidden="true">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-gold" /> Geboekt</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border border-gold/70" /> Offerte open</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-white/50" /> Nieuwe aanvraag</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-white/20" /> Geblokkeerd</span>
      </div>

      {loading ? (
        <div className="rounded-xl border border-white/5 bg-surface-elevated p-10 text-center text-muted">Laden…</div>
      ) : view === 'week' ? (
        <WeekView weekStart={weekStart} todayStr={todayStr} byDate={byDate} blockedByDate={blockedByDate} onSelect={setSelectedDate} />
      ) : (
        <>
          {/* Month grid from sm up; phones get a day list */}
          <div className="hidden sm:block">
            <MonthGrid anchor={anchor} todayStr={todayStr} byDate={byDate} blockedByDate={blockedByDate} onSelect={setSelectedDate} />
          </div>
          <div className="sm:hidden">
            <MonthList anchor={anchor} todayStr={todayStr} byDate={byDate} blockedByDate={blockedByDate} onSelect={setSelectedDate} />
          </div>
        </>
      )}

      <Drawer open={selectedDate !== null} title={selectedDate ? capitalize(formatDateLongNL(selectedDate)) : ''} onClose={() => setSelectedDate(null)}>
        {selectedDate && (
          <div className="flex flex-col gap-5">
            {selectedBlock && (
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <div className="mb-1 flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-muted"><IconBlock size={14} /> Geblokkeerd</div>
                {selectedBlock.reason && <p className="text-[0.9375rem] text-white/85">{selectedBlock.reason}</p>}
                <button
                  onClick={() => unblockDay(selectedBlock)}
                  className="mt-3 h-10 rounded-lg border border-white/15 px-4 text-sm text-white/85 transition-colors hover:border-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
                >
                  Blokkade opheffen
                </button>
              </div>
            )}

            {selectedItems.map((r) => {
              const kind = kindOf(r.status)!;
              return (
                <div key={r.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="font-heading text-xl text-white">{r.full_name}</h3>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium uppercase tracking-wide ${KIND_META[kind].chip}`}>{KIND_META[kind].label}</span>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-5 gap-y-3 text-[0.9375rem]">
                    <Detail label="Evenement" value={r.event_type} />
                    <Detail label="Tijd" value={r.event_time ? `${r.event_time.slice(0, 5)} uur` : '—'} />
                    <Detail label="Plaats" value={r.event_city} />
                    <Detail label="Gasten" value={String(r.guest_count)} />
                    <Detail label="Pakket" value={packageNames[r.package_id] ?? '—'} />
                    <Detail label="Geschat" value={formatEuro(r.estimated_total)} accent />
                  </dl>
                  {r.special_requests && <p className="mt-3 text-sm leading-relaxed text-white/75">{r.special_requests}</p>}
                  <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/5 pt-4">
                    <a href={`tel:${r.phone}`} className="rounded text-sm text-white/85 transition-colors hover:text-gold-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light">{r.phone}</a>
                    <a href={`mailto:${r.email}`} className="rounded text-sm text-white/85 transition-colors hover:text-gold-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light">{r.email}</a>
                    <Link
                      to={`/aanvragen/${r.id}`}
                      className="ml-auto inline-flex h-10 items-center rounded-lg bg-gold px-4 text-sm font-medium text-surface transition-colors duration-200 hover:bg-gold-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
                    >
                      Open aanvraag
                    </Link>
                  </div>
                </div>
              );
            })}

            {!selectedBlock && (
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <label htmlFor="block-reason" className="mb-1.5 block text-sm text-muted">
                  {selectedItems.length === 0 ? 'Geen klussen op deze dag. Dag blokkeren?' : 'Dag alsnog blokkeren?'}
                </label>
                <div className="flex gap-2">
                  <input
                    id="block-reason"
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="Reden (optioneel)"
                    className="h-11 min-w-0 flex-1 rounded-lg border border-white/10 bg-surface px-3 text-[0.9375rem] text-white placeholder:text-muted transition-colors focus:border-gold/50 focus:outline-none"
                  />
                  <button
                    onClick={() => blockDay(selectedDate)}
                    className="h-11 shrink-0 rounded-lg border border-white/15 px-4 text-[0.9375rem] text-white/85 transition-colors hover:border-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
                  >
                    Blokkeer
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </AdminLayout>
  );
}

interface ViewProps {
  todayStr: string;
  byDate: Map<string, AgendaRequest[]>;
  blockedByDate: Map<string, BlockedDate>;
  onSelect: (date: string) => void;
}

const HATCH: React.CSSProperties = {
  backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 6px, rgb(var(--c-ink) / 0.05) 6px, rgb(var(--c-ink) / 0.05) 12px)',
};

function DayChip({ r }: { r: AgendaRequest }) {
  const kind = kindOf(r.status)!;
  if (kind === 'aanvraag') {
    return (
      <span className="flex items-center gap-1.5 truncate px-1 text-xs text-white/70">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/50" aria-hidden="true" />
        <span className="truncate">{r.full_name.split(/\s+/).slice(-1)[0]}</span>
      </span>
    );
  }
  return (
    <span className={`block truncate rounded-md border px-1.5 py-1 text-xs leading-tight ${KIND_META[kind].chip}`}>
      <span className="font-medium">{r.event_city}</span>
      <span className="opacity-80"> · {r.guest_count}p</span>
    </span>
  );
}

function MonthGrid({ anchor, todayStr, byDate, blockedByDate, onSelect }: ViewProps & { anchor: Date }) {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - offset);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks = Math.ceil((offset + daysInMonth) / 7);
  const cells = Array.from({ length: weeks * 7 }, (_, i) => addDays(gridStart, i));

  return (
    <div className="overflow-hidden rounded-xl border border-white/5 bg-surface-elevated">
      <div className="grid grid-cols-7 border-b border-white/5">
        {WEEKDAY_SHORT.map((d) => (
          <div key={d} className="px-3 py-2.5 text-center text-xs uppercase tracking-wide text-muted">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          const dateStr = toDateOnly(day);
          const inMonth = day.getMonth() === month;
          const items = byDate.get(dateStr) ?? [];
          const isBlocked = blockedByDate.has(dateStr);
          const isToday = dateStr === todayStr;
          return (
            <button
              key={i}
              onClick={() => onSelect(dateStr)}
              aria-label={`${formatDateLongNL(dateStr)}${isBlocked ? ', geblokkeerd' : ''}${items.length ? `, ${items.length} items` : ''}`}
              className={`relative flex min-h-[6.5rem] flex-col gap-1 border-b border-r border-white/5 p-1.5 text-left transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold-light [&:nth-child(7n)]:border-r-0 ${
                inMonth ? 'hover:bg-white/[0.03]' : 'bg-black/20'
              }`}
              style={isBlocked ? HATCH : undefined}
            >
              <span className={`inline-flex h-6 w-6 items-center justify-center self-start rounded-full text-sm ${
                isToday ? 'bg-gold font-medium text-surface' : inMonth ? 'text-white' : 'text-muted/50'
              }`}>
                {day.getDate()}
              </span>
              {isBlocked && items.length === 0 && <span className="px-1 text-xs text-muted">Geblokkeerd</span>}
              {items.slice(0, 3).map((r) => <DayChip key={r.id} r={r} />)}
              {items.length > 3 && <span className="px-1 text-xs text-muted">+{items.length - 3} meer</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Phones: the grid becomes a readable list of the month's days with items. */
function MonthList({ anchor, todayStr, byDate, blockedByDate, onSelect }: ViewProps & { anchor: Date }) {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));
  const rows = days
    .map((d) => {
      const dateStr = toDateOnly(d);
      return { dateStr, d, items: byDate.get(dateStr) ?? [], block: blockedByDate.get(dateStr) };
    })
    .filter((r) => r.items.length > 0 || r.block || r.dateStr === todayStr);

  if (rows.length === 0) {
    return <div className="rounded-xl border border-white/5 bg-surface-elevated p-8 text-center text-muted">Niets gepland deze maand.</div>;
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map(({ dateStr, d, items, block }) => (
        <li key={dateStr}>
          <button
            onClick={() => onSelect(dateStr)}
            className={`flex w-full items-start gap-4 rounded-xl border p-4 text-left transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2 ${
              dateStr === todayStr ? 'border-gold/40 bg-gold/[0.06]' : 'border-white/5 bg-surface-elevated hover:border-white/15'
            }`}
            style={block ? HATCH : undefined}
          >
            <span className="w-11 shrink-0 text-center">
              <span className="block text-xs uppercase text-muted">{WEEKDAY_SHORT[(d.getDay() + 6) % 7]}</span>
              <span className={`block text-xl font-semibold ${dateStr === todayStr ? 'text-gold-light' : 'text-white'}`}>{d.getDate()}</span>
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1.5 pt-0.5">
              {block && <span className="text-sm text-muted">Geblokkeerd{block.reason ? ` — ${block.reason}` : ''}</span>}
              {items.length === 0 && !block && <span className="text-sm text-muted">Niets gepland vandaag.</span>}
              {items.map((r) => {
                const kind = kindOf(r.status)!;
                return (
                  <span key={r.id} className="flex items-center gap-2 text-[0.9375rem]">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${kind === 'offerte' ? 'border border-gold/70' : KIND_META[kind].dot}`} aria-hidden="true" />
                    <span className="truncate text-white">{r.full_name}</span>
                    <span className="shrink-0 text-sm text-muted">{r.event_city} · {r.guest_count}p</span>
                  </span>
                );
              })}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function WeekView({ weekStart, todayStr, byDate, blockedByDate, onSelect }: ViewProps & { weekStart: Date }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7 lg:gap-2">
      {days.map((day, i) => {
        const dateStr = toDateOnly(day);
        const items = byDate.get(dateStr) ?? [];
        const block = blockedByDate.get(dateStr);
        const isToday = dateStr === todayStr;
        return (
          <button
            key={dateStr}
            onClick={() => onSelect(dateStr)}
            className={`flex min-h-[9rem] flex-col rounded-xl border p-3 text-left transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2 ${
              isToday ? 'border-gold/40 bg-gold/[0.06]' : 'border-white/5 bg-surface-elevated hover:border-white/10'
            }`}
            style={block ? HATCH : undefined}
          >
            <div className="mb-2 flex items-baseline justify-between">
              <span className={`text-sm uppercase tracking-wide ${isToday ? 'text-gold-light' : 'text-muted'}`}>{WEEKDAY_SHORT[i]}</span>
              <span className={`font-heading text-lg ${isToday ? 'text-gold-light' : 'text-white'}`}>{day.getDate()}</span>
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              {block && <span className="text-xs text-muted">Geblokkeerd</span>}
              {items.length === 0 && !block ? (
                <span className="mt-auto text-sm text-muted/50">—</span>
              ) : (
                items.map((r) => <DayChip key={r.id} r={r} />)
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function NavBtn({ children, label, onClick }: { children: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 text-xl leading-none text-muted transition-colors hover:border-white/25 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
    >
      {children}
    </button>
  );
}

function Detail({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <dt className="mb-0.5 text-xs uppercase tracking-widest text-muted">{label}</dt>
      <dd className={accent ? 'font-heading text-lg text-gold-light' : 'text-[0.9375rem] text-white'}>{value}</dd>
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
