import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../shared/lib/supabase';
import { AdminLayout } from '../layout/AdminLayout';
import { Badge } from '../components/Badge';
import { Drawer } from '../components/Drawer';
import { formatDateNL, formatDateLongNL, formatEuro } from '../../shared/lib/format';
import type { QuoteRequest, QuoteStatus } from '../../shared/types/db';

const STATUSES: QuoteStatus[] = ['new', 'reviewed', 'quoted', 'confirmed', 'declined'];

const STATUS_LABELS: Record<QuoteStatus, string> = {
  new: 'Nieuw',
  reviewed: 'Bekeken',
  quoted: 'Offerte verstuurd',
  confirmed: 'Bevestigd',
  declined: 'Afgewezen',
};

// Small round status marker so the list scans by colour without a side-stripe.
const STATUS_DOT: Record<QuoteStatus, string> = {
  new: 'bg-gold-light',
  reviewed: 'bg-white/60',
  quoted: 'bg-gold',
  confirmed: 'bg-emerald-400',
  declined: 'bg-red-400',
};

// The three "in-between" statuses reachable from the small dropdown; Accepteren
// (confirmed) and Verwijderen are the two prominent one-click actions.
const SECONDARY_STATUSES: QuoteStatus[] = ['new', 'reviewed', 'quoted', 'declined'];

const cellLabel = 'text-xs uppercase tracking-widest text-muted mb-1';
const cellValue = 'text-base text-white';

export function QuoteRequests() {
  const [requests, setRequests] = useState<QuoteRequest[]>([]);
  const [packageNames, setPackageNames] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<QuoteStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  async function load() {
    const [reqRes, pkgRes] = await Promise.all([
      supabase.from('quote_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('service_packages').select('id, package_name'),
    ]);
    if (reqRes.error) { console.error('Failed to load quote requests', reqRes.error); setLoading(false); return; }
    if (pkgRes.error) { console.error('Failed to load service packages', pkgRes.error); }
    setRequests(reqRes.data ?? []);
    setPackageNames(Object.fromEntries((pkgRes.data ?? []).map((p) => [p.id, p.package_name])));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const counts = useMemo(() => {
    const base: Record<string, number> = { all: requests.length };
    for (const s of STATUSES) base[s] = 0;
    for (const r of requests) base[r.status] += 1;
    return base;
  }, [requests]);

  async function updateStatus(id: string, status: QuoteStatus) {
    const previous = requests;
    setRequests((rows) => rows.map((r) => (r.id === id ? { ...r, status } : r)));
    const { error } = await supabase.from('quote_requests').update({ status }).eq('id', id);
    if (error) { console.error('Failed to update quote request status', error); setRequests(previous); }
  }

  async function remove(id: string) {
    const previous = requests;
    setRequests((rows) => rows.filter((r) => r.id !== id));
    setConfirmingDeleteId(null);
    if (openId === id) setOpenId(null);
    const { error } = await supabase.from('quote_requests').delete().eq('id', id);
    if (error) { console.error('Failed to delete quote request', error); setRequests(previous); }
  }

  const visible = filter === 'all' ? requests : requests.filter((r) => r.status === filter);
  const openRequest = requests.find((r) => r.id === openId) ?? null;
  const packageName = (id: string) => packageNames[id] ?? 'Onbekend pakket';

  return (
    <AdminLayout title="Offerteaanvragen">
      {/* Segmented status filter with live counts */}
      <div className="mb-8 inline-flex flex-wrap gap-1 rounded-xl border border-white/10 bg-surface-elevated p-1">
        <FilterTab active={filter === 'all'} label="Alle" count={counts.all} onClick={() => setFilter('all')} />
        {STATUSES.map((s) => (
          <FilterTab key={s} active={filter === s} label={STATUS_LABELS[s]} count={counts[s]} onClick={() => setFilter(s)} />
        ))}
      </div>

      {loading ? (
        <div className="rounded-xl border border-white/5 bg-surface-elevated p-10 text-center text-muted text-lg">Laden...</div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-white/5 bg-surface-elevated p-10 text-center text-muted text-lg">Geen offerteaanvragen gevonden.</div>
      ) : (
        <div className="flex flex-col gap-4">
          {visible.map((r) => (
            <article
              key={r.id}
              className="group rounded-xl border border-white/5 bg-surface-elevated p-6 shadow-[0_15px_35px_-20px_rgba(0,0,0,0.6)] transition-colors duration-200 hover:border-white/10"
            >
              {/* Header: name + type opens the detail drawer; status badge on the right */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT[r.status]}`} aria-hidden="true" />
                  <button
                    onClick={() => setOpenId(r.id)}
                    className="min-w-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2 rounded"
                  >
                    <h2 className="font-heading text-2xl leading-tight text-white transition-colors group-hover:text-gold-light truncate">{r.full_name}</h2>
                    <p className="text-base text-muted">{r.event_type} · {formatDateNL(r.event_date)}{r.event_time ? ` · ${r.event_time.slice(0, 5)}` : ''}</p>
                  </button>
                </div>
                <Badge status={r.status} />
              </div>

              {/* At-a-glance detail grid */}
              <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
                <Cell label="Plaats" value={`${r.event_city}`} sub={r.event_postcode} />
                <Cell label="Gasten" value={String(r.guest_count)} />
                <Cell label="Cocktails" value={String(r.cocktail_count)} />
                <Cell label="Pakket" value={packageName(r.package_id)} />
                <Cell label="Totaal" value={formatEuro(r.estimated_total)} accent />
                <Cell label="Contact" value={r.email} sub={r.phone} />
              </div>

              {r.special_requests && (
                <p className="mt-4 line-clamp-2 rounded-lg bg-white/[0.03] px-4 py-3 text-base text-white/75">
                  <span className="text-muted">Verzoek: </span>{r.special_requests}
                </p>
              )}

              {/* Actions */}
              <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/5 pt-5">
                {r.status !== 'confirmed' && (
                  <button
                    onClick={() => updateStatus(r.id, 'confirmed')}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/15 px-4 py-2.5 text-base font-medium text-emerald-300 border border-emerald-500/30 transition-colors duration-200 hover:bg-emerald-500/25 active:bg-emerald-500/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300 focus-visible:outline-offset-2"
                  >
                    <CheckIcon /> Accepteren
                  </button>
                )}

                <label className="relative">
                  <span className="sr-only">Status wijzigen</span>
                  <select
                    value={r.status}
                    onChange={(e) => updateStatus(r.id, e.target.value as QuoteStatus)}
                    className="appearance-none rounded-lg border border-white/15 bg-surface px-3 py-2.5 pr-9 text-base text-white transition-colors hover:border-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
                  >
                    {SECONDARY_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                    <option value="confirmed">{STATUS_LABELS.confirmed}</option>
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted">▾</span>
                </label>

                <button
                  onClick={() => setOpenId(r.id)}
                  className="rounded-lg px-4 py-2.5 text-base text-muted transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
                >
                  Details
                </button>

                <div className="ml-auto">
                  {confirmingDeleteId === r.id ? (
                    <div className="inline-flex items-center gap-2">
                      <span className="text-base text-red-300">Definitief verwijderen?</span>
                      <button
                        onClick={() => remove(r.id)}
                        className="rounded-lg bg-red-500/20 px-3 py-2 text-base font-medium text-red-200 border border-red-500/40 transition-colors hover:bg-red-500/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-300 focus-visible:outline-offset-2"
                      >
                        Ja, verwijder
                      </button>
                      <button
                        onClick={() => setConfirmingDeleteId(null)}
                        className="rounded-lg px-3 py-2 text-base text-muted transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
                      >
                        Annuleer
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmingDeleteId(r.id)}
                      className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-base text-muted border border-transparent transition-colors duration-200 hover:text-red-300 hover:border-red-500/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-300 focus-visible:outline-offset-2"
                    >
                      <TrashIcon /> Verwijderen
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Drawer open={openRequest !== null} title={openRequest?.full_name ?? ''} onClose={() => setOpenId(null)}>
        {openRequest && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <Badge status={openRequest.status} />
              <span className="text-base text-muted">{formatDateLongNL(openRequest.event_date)}</span>
            </div>

            <dl className="grid grid-cols-2 gap-x-5 gap-y-5">
              <DetailRow label="Evenement" value={openRequest.event_type} />
              <DetailRow label="Begintijd" value={openRequest.event_time ? openRequest.event_time.slice(0, 5) : '—'} />
              <DetailRow label="Pakket" value={packageName(openRequest.package_id)} />
              <DetailRow label="Plaats" value={openRequest.event_city} />
              <DetailRow label="Postcode" value={openRequest.event_postcode} />
              <DetailRow label="Gasten" value={String(openRequest.guest_count)} />
              <DetailRow label="Cocktails" value={String(openRequest.cocktail_count)} />
              <DetailRow label="Afstand" value={`${openRequest.distance_km} km`} />
              <DetailRow label="Geschat totaal" value={formatEuro(openRequest.estimated_total)} accent />
            </dl>

            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
              <div className="text-xs uppercase tracking-widest text-muted mb-2">Contact</div>
              <a href={`mailto:${openRequest.email}`} className="block text-base text-white hover:text-gold-light transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light rounded">{openRequest.email}</a>
              {openRequest.phone && <a href={`tel:${openRequest.phone}`} className="block text-base text-white hover:text-gold-light transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light rounded">{openRequest.phone}</a>}
            </div>

            {openRequest.special_requests && (
              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
                <div className="text-xs uppercase tracking-widest text-muted mb-2">Bijzondere verzoeken</div>
                <p className="text-base leading-relaxed text-white/80">{openRequest.special_requests}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-3 border-t border-white/5 pt-6">
              {openRequest.status !== 'confirmed' && (
                <button
                  onClick={() => updateStatus(openRequest.id, 'confirmed')}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/15 px-4 py-2.5 text-base font-medium text-emerald-300 border border-emerald-500/30 transition-colors hover:bg-emerald-500/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300 focus-visible:outline-offset-2"
                >
                  <CheckIcon /> Accepteren
                </button>
              )}
              {confirmingDeleteId === openRequest.id ? (
                <div className="inline-flex items-center gap-2">
                  <button onClick={() => remove(openRequest.id)} className="rounded-lg bg-red-500/20 px-3 py-2.5 text-base font-medium text-red-200 border border-red-500/40 hover:bg-red-500/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-300 focus-visible:outline-offset-2">Ja, verwijder</button>
                  <button onClick={() => setConfirmingDeleteId(null)} className="rounded-lg px-3 py-2.5 text-base text-muted hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2">Annuleer</button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmingDeleteId(openRequest.id)}
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-base text-muted border border-transparent transition-colors hover:text-red-300 hover:border-red-500/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-300 focus-visible:outline-offset-2"
                >
                  <TrashIcon /> Verwijderen
                </button>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </AdminLayout>
  );
}

function FilterTab({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-base transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2 ${
        active ? 'bg-gold text-surface' : 'text-muted hover:text-white'
      }`}
    >
      {label}
      <span className={`rounded-full px-2 py-0.5 text-sm tabular-nums ${active ? 'bg-surface/20 text-surface' : 'bg-white/10 text-muted'}`}>{count}</span>
    </button>
  );
}

function Cell({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="min-w-0">
      <div className={cellLabel}>{label}</div>
      <div className={`${accent ? 'font-heading text-lg text-gold-light' : cellValue} truncate`} title={value}>{value}</div>
      {sub && <div className="text-sm text-muted truncate" title={sub}>{sub}</div>}
    </div>
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

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
  );
}

function TrashIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
  );
}
