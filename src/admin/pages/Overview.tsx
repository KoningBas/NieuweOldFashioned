import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../shared/lib/supabase';
import { AdminLayout } from '../layout/AdminLayout';
import { SkeletonBlock, SkeletonRows } from '../components/Skeleton';
import { IconChevronRight } from '../components/icons';
import { formatEuro, parseDateOnly, toDateOnly } from '../../shared/lib/format';
import { attentionSignals, normalizeStatus, type AttentionSignal } from '../../shared/lib/workflow';
import type { Invoice, Quote, QuoteRequest } from '../../shared/types/db';

interface DashData {
  requests: QuoteRequest[];
  quotes: Pick<Quote, 'request_id' | 'status' | 'sent_at' | 'total_incl' | 'valid_until'>[];
  invoices: Invoice[];
  nudgeNew: number;
  nudgeQuote: number;
}

const SIGNAL_KIND_LABEL: Record<AttentionSignal['kind'], string> = {
  unanswered: 'Onbeantwoord',
  quote_silent: 'Nabellen',
  not_invoiced: 'Factureren',
  invoice_overdue: 'Herinneren',
};

export function Overview() {
  const [data, setData] = useState<DashData | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      const [reqRes, quoteRes, invRes, setRes] = await Promise.all([
        supabase.from('quote_requests').select('*'),
        supabase.from('quotes').select('request_id, status, sent_at, total_incl, valid_until'),
        supabase.from('invoices').select('*'),
        supabase.from('service_settings').select('nudge_new_days, nudge_quote_days').limit(1).maybeSingle(),
      ]);
      if (!alive) return;
      setData({
        requests: reqRes.data ?? [],
        // Pre-migration these tables are absent; empty arrays keep the board honest.
        quotes: quoteRes.error ? [] : (quoteRes.data ?? []),
        invoices: invRes.error ? [] : (invRes.data ?? []),
        nudgeNew: setRes.data?.nudge_new_days ?? 3,
        nudgeQuote: setRes.data?.nudge_quote_days ?? 7,
      });
    }
    load().catch((err) => console.error('Failed to load overview', err));
    return () => { alive = false; };
  }, []);

  const view = useMemo(() => {
    if (!data) return null;
    const now = new Date();
    const today = toDateOnly(now);
    const monthStart = toDateOnly(new Date(now.getFullYear(), now.getMonth(), 1));
    const yearStart = toDateOnly(new Date(now.getFullYear(), 0, 1));
    const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7);

    // Hard definitions from the design doc — revenue comes from invoices,
    // never from wizard estimates.
    const revenueMonth = data.invoices.filter((i) => i.issued_on >= monthStart).reduce((s, i) => s + i.total_incl, 0);
    const revenueYear = data.invoices.filter((i) => i.issued_on >= yearStart).reduce((s, i) => s + i.total_incl, 0);
    const doneStatuses = ['completed', 'invoiced', 'paid'];
    const jobsMonth = data.requests.filter((r) => doneStatuses.includes(normalizeStatus(r.status)) && r.event_date >= monthStart && r.event_date <= today).length;
    const jobsYear = data.requests.filter((r) => doneStatuses.includes(normalizeStatus(r.status)) && r.event_date >= yearStart && r.event_date <= today).length;
    const openQuotes = data.quotes.filter((q) => q.status === 'sent' && q.valid_until >= today);
    const openQuoteValue = openQuotes.reduce((s, q) => s + q.total_incl, 0);
    const newCount = data.requests.filter((r) => normalizeStatus(r.status) === 'new').length;

    const signals = attentionSignals(
      data.requests, data.quotes, data.invoices,
      { nudge_new_days: data.nudgeNew, nudge_quote_days: data.nudgeQuote },
      now, formatEuro,
    );

    const active = (r: QuoteRequest) => ['booked', 'completed'].includes(normalizeStatus(r.status));
    const todayJobs = data.requests.filter((r) => active(r) && r.event_date === today);
    const weekJobs = data.requests
      .filter((r) => active(r) && r.event_date > today && parseDateOnly(r.event_date) <= weekEnd)
      .sort((a, b) => a.event_date.localeCompare(b.event_date));

    return { revenueMonth, revenueYear, jobsMonth, jobsYear, openQuotes: openQuotes.length, openQuoteValue, newCount, signals, todayJobs, weekJobs };
  }, [data]);

  const WEEKDAY = new Intl.DateTimeFormat('nl-NL', { weekday: 'short' });

  return (
    <AdminLayout title="Overzicht">
      {!view ? (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <SkeletonBlock key={i} className="h-28" />)}
          </div>
          <SkeletonRows rows={3} />
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Numbers first (user's choice) */}
          <section aria-label="Kerncijfers" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Deze maand" primary={formatEuro(view.revenueMonth)} secondary={`${view.jobsMonth} ${view.jobsMonth === 1 ? 'klus' : 'klussen'}`} />
            <Stat label="Dit jaar" primary={formatEuro(view.revenueYear)} secondary={`${view.jobsYear} ${view.jobsYear === 1 ? 'klus' : 'klussen'}`} />
            <Stat label="Openstaande offertes" primary={formatEuro(view.openQuoteValue)} secondary={`${view.openQuotes} ${view.openQuotes === 1 ? 'offerte' : 'offertes'}`} />
            <Stat label="Nieuwe aanvragen" primary={String(view.newCount)} secondary="nog niet bekeken" link="/aanvragen" />
          </section>

          {/* Work list */}
          <section aria-label="Vraagt aandacht">
            <h2 className="mb-3 font-heading text-xl">
              Vraagt aandacht {view.signals.length > 0 && <span className="text-muted">({view.signals.length})</span>}
            </h2>
            {view.signals.length === 0 ? (
              <div className="rounded-xl border border-white/5 bg-surface-elevated p-8 text-center text-muted">
                Niets blijven liggen. Alles wat hier verschijnt — onbeantwoorde aanvragen, stille offertes, openstaande facturen — heb je afgehandeld.
              </div>
            ) : (
              <ul className="overflow-hidden rounded-xl border border-white/5 bg-surface-elevated">
                {view.signals.map((s) => (
                  <li key={`${s.kind}-${s.requestId}`} className="border-b border-white/5 last:border-b-0">
                    <Link
                      to={s.href}
                      className="flex items-center gap-4 px-5 py-3.5 transition-colors duration-150 hover:bg-white/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold-light"
                    >
                      <span className={`hidden w-24 shrink-0 rounded-full border px-2 py-0.5 text-center text-[0.6875rem] font-medium uppercase tracking-wide sm:block ${
                        s.kind === 'invoice_overdue' ? 'border-danger/30 bg-danger/10 text-danger' : 'border-gold/30 bg-gold/10 text-gold-light'
                      }`}>
                        {SIGNAL_KIND_LABEL[s.kind]}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.9375rem] font-medium text-white">{s.title}</span>
                        <span className={`block truncate text-sm ${s.kind === 'invoice_overdue' ? 'text-danger' : 'text-muted'}`}>{s.detail}</span>
                      </span>
                      <IconChevronRight size={16} className="shrink-0 text-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Today + this week */}
          <div className="grid gap-8 lg:grid-cols-2">
            <section aria-label="Vandaag">
              <h2 className="mb-3 font-heading text-xl">Vandaag</h2>
              {view.todayJobs.length === 0 ? (
                <div className="rounded-xl border border-white/5 bg-surface-elevated p-6 text-muted">Geen klussen vandaag.</div>
              ) : (
                <JobList jobs={view.todayJobs} weekday={WEEKDAY} />
              )}
            </section>
            <section aria-label="Deze week">
              <h2 className="mb-3 font-heading text-xl">Deze week</h2>
              {view.weekJobs.length === 0 ? (
                <div className="rounded-xl border border-white/5 bg-surface-elevated p-6 text-muted">Geen klussen de komende zeven dagen.</div>
              ) : (
                <JobList jobs={view.weekJobs} weekday={WEEKDAY} />
              )}
            </section>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function Stat({ label, primary, secondary, link }: { label: string; primary: string; secondary: string; link?: string }) {
  const inner = (
    <>
      <div className="text-xs uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{primary}</div>
      <div className="mt-0.5 text-sm text-muted">{secondary}</div>
    </>
  );
  const cls = 'block rounded-xl border border-white/5 bg-surface-elevated p-5';
  if (link) {
    return (
      <Link to={link} className={`${cls} transition-colors duration-150 hover:border-gold/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2`}>
        {inner}
      </Link>
    );
  }
  return <div className={cls}>{inner}</div>;
}

function JobList({ jobs, weekday }: { jobs: QuoteRequest[]; weekday: Intl.DateTimeFormat }) {
  return (
    <ul className="overflow-hidden rounded-xl border border-white/5 bg-surface-elevated">
      {jobs.map((job) => (
        <li key={job.id} className="border-b border-white/5 last:border-b-0">
          <Link
            to={`/aanvragen/${job.id}`}
            className="flex items-center gap-4 px-5 py-3.5 transition-colors duration-150 hover:bg-white/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold-light"
          >
            <span className="w-12 shrink-0 text-center">
              <span className="block text-xs uppercase text-muted">{weekday.format(parseDateOnly(job.event_date))}</span>
              <span className="block text-lg font-semibold text-gold-light">{parseDateOnly(job.event_date).getDate()}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.9375rem] font-medium text-white">{job.full_name}</span>
              <span className="block truncate text-sm text-muted">
                {job.event_city} · {job.guest_count} gasten{job.event_time ? ` · ${job.event_time.slice(0, 5)} uur` : ''}
              </span>
            </span>
            <IconChevronRight size={16} className="shrink-0 text-muted" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
