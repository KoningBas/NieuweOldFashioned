import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../shared/lib/supabase';
import { AdminLayout } from '../layout/AdminLayout';
import { Badge } from '../components/Badge';
import { SkeletonRows } from '../components/Skeleton';
import { IconSearch } from '../components/icons';
import { formatDateNL, formatEuro, parseDateOnly } from '../../shared/lib/format';
import { ARCHIVE_STATUSES, normalizeStatus, STATUS_LABELS, type CanonicalStatus } from '../../shared/lib/workflow';
import type { QuoteRequest } from '../../shared/types/db';

// Tab order follows the pipeline; the archive collects what is finished.
const PIPELINE: CanonicalStatus[] = ['new', 'reviewed', 'quoted', 'booked', 'completed', 'invoiced'];

type Filter = 'alle' | CanonicalStatus | 'archief';

const MS_PER_DAY = 86_400_000;

/** "Termijn" column: how long a lead has been waiting, or how far away a
 *  booked job is. The one column that makes old requests visible. */
function termijn(r: QuoteRequest, nudgeDays: number): { text: string; urgent: boolean } | null {
  const s = normalizeStatus(r.status);
  if (s === 'new' || s === 'reviewed' || s === 'quoted') {
    const days = Math.floor((Date.now() - new Date(r.created_at).getTime()) / MS_PER_DAY);
    if (days <= 0) return { text: 'vandaag', urgent: false };
    return { text: `ligt ${days} ${days === 1 ? 'dag' : 'dgn'}`, urgent: days >= nudgeDays };
  }
  if (s === 'booked' || s === 'completed') {
    const days = Math.round((parseDateOnly(r.event_date).getTime() - new Date().setHours(0, 0, 0, 0)) / MS_PER_DAY);
    if (days > 0) return { text: `over ${days} ${days === 1 ? 'dag' : 'dgn'}`, urgent: false };
    if (days === 0) return { text: 'vandaag', urgent: true };
  }
  return null;
}

export function Requests() {
  const [requests, setRequests] = useState<QuoteRequest[]>([]);
  const [packageNames, setPackageNames] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<Filter>('alle');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [reqRes, pkgRes] = await Promise.all([
        supabase.from('quote_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('service_packages').select('id, package_name'),
      ]);
      if (reqRes.error) { console.error('Failed to load requests', reqRes.error); setLoading(false); return; }
      setRequests(reqRes.data ?? []);
      setPackageNames(Object.fromEntries((pkgRes.data ?? []).map((p) => [p.id, p.package_name])));
      setLoading(false);
    }
    load();
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { alle: 0, archief: 0 };
    for (const s of PIPELINE) c[s] = 0;
    for (const r of requests) {
      const s = normalizeStatus(r.status);
      if (ARCHIVE_STATUSES.includes(s)) { c.archief += 1; continue; }
      c.alle += 1;
      if (s in c) c[s] += 1;
    }
    return c;
  }, [requests]);

  const visible = useMemo(() => {
    let rows = requests;
    if (filter === 'alle') rows = rows.filter((r) => !ARCHIVE_STATUSES.includes(normalizeStatus(r.status)));
    else if (filter === 'archief') rows = rows.filter((r) => ARCHIVE_STATUSES.includes(normalizeStatus(r.status)));
    else rows = rows.filter((r) => normalizeStatus(r.status) === filter);

    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) =>
        r.full_name.toLowerCase().includes(q) ||
        r.event_city.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [requests, filter, query]);

  return (
    <AdminLayout title="Aanvragen">
      {/* Filter tabs + search */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="inline-flex flex-wrap gap-1 rounded-xl border border-white/10 bg-surface-elevated p-1" role="tablist" aria-label="Filter op status">
          <FilterTab active={filter === 'alle'} label="Alle" count={counts.alle} onClick={() => setFilter('alle')} />
          {PIPELINE.map((s) => (
            <FilterTab key={s} active={filter === s} label={STATUS_LABELS[s]} count={counts[s]} onClick={() => setFilter(s)} />
          ))}
          <FilterTab active={filter === 'archief'} label="Archief" count={counts.archief} onClick={() => setFilter('archief')} />
        </div>
        <label className="relative ml-auto min-w-[14rem] flex-1 sm:max-w-xs">
          <span className="sr-only">Zoek op naam, plaats of e-mail</span>
          <IconSearch size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zoek naam, plaats, e-mail"
            className="h-11 w-full rounded-lg border border-white/10 bg-surface-elevated pl-9 pr-3 text-[0.9375rem] text-white placeholder:text-muted transition-colors hover:border-white/20 focus:border-gold/50 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
          />
        </label>
      </div>

      {loading ? (
        <SkeletonRows rows={5} />
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-white/5 bg-surface-elevated p-10 text-center text-muted">
          {requests.length === 0
            ? 'Nog geen aanvragen. Nieuwe aanvragen van de offerte-wizard en het workshopformulier verschijnen hier vanzelf.'
            : 'Niets gevonden binnen dit filter.'}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/5 bg-surface-elevated">
          {/* Column header, desktop only */}
          <div className="hidden gap-4 border-b border-white/5 px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted lg:grid lg:grid-cols-[minmax(0,2.4fr)_1.2fr_1fr_0.5fr_0.9fr_1.2fr_1fr]">
            <span>Klant</span><span>Datum</span><span>Plaats</span>
            <span className="text-right">Gasten</span><span className="text-right">Bedrag</span>
            <span>Status</span><span>Termijn</span>
          </div>
          <ul>
            {visible.map((r) => {
              const t = termijn(r, 3);
              return (
                <li key={r.id} className="border-b border-white/5 last:border-b-0">
                  <Link
                    to={`/aanvragen/${r.id}`}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-5 py-4 transition-colors duration-150 hover:bg-white/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold-light lg:grid-cols-[minmax(0,2.4fr)_1.2fr_1fr_0.5fr_0.9fr_1.2fr_1fr]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-white">{r.full_name}</span>
                      <span className="block truncate text-sm text-muted">
                        {r.event_type}
                        <span className="lg:hidden"> · {formatDateNL(r.event_date)} · {r.event_city}</span>
                        <span className="hidden lg:inline"> · {packageNames[r.package_id] ?? 'Onbekend pakket'}</span>
                      </span>
                    </span>
                    <span className="hidden text-[0.9375rem] text-white/85 lg:block">{formatDateNL(r.event_date)}</span>
                    <span className="hidden truncate text-[0.9375rem] text-white/85 lg:block">{r.event_city}</span>
                    <span className="hidden text-right text-[0.9375rem] text-white/85 lg:block">{r.guest_count}</span>
                    <span className="hidden text-right text-[0.9375rem] font-medium text-white lg:block">{formatEuro(r.estimated_total)}</span>
                    <span className="row-start-1 col-start-2 justify-self-end lg:row-auto lg:col-auto lg:justify-self-start"><Badge status={r.status} /></span>
                    <span className={`col-start-2 row-start-2 justify-self-end text-sm lg:col-auto lg:row-auto lg:justify-self-start ${t?.urgent ? 'font-medium text-danger' : 'text-muted'}`}>
                      {t?.text ?? '—'}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </AdminLayout>
  );
}

function FilterTab({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2 ${
        active ? 'bg-gold font-medium text-surface' : 'text-muted hover:text-white'
      }`}
    >
      {label}
      <span className={`rounded-full px-1.5 text-xs ${active ? 'bg-surface/20 text-surface' : 'bg-white/10 text-muted'}`}>{count}</span>
    </button>
  );
}
