import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../../shared/lib/supabase';
import { AdminLayout } from '../layout/AdminLayout';
import { PackingTemplateEditor } from '../components/PackingTemplateEditor';
import { SkeletonRows } from '../components/Skeleton';
import { SaveBar } from '../components/SaveBar';
import { SaveStatusProvider } from '../lib/saveState';
import { IconChevronRight } from '../components/icons';
import { formatDateNL, toDateOnly } from '../../shared/lib/format';
import { normalizeStatus } from '../../shared/lib/workflow';
import type { QuoteRequest } from '../../shared/types/db';

interface JobRow {
  request: QuoteRequest;
  total: number;
  checked: number;
  hasList: boolean;
}

type PaneId = 'klussen' | 'basis';
const PANES: { id: PaneId; label: string }[] = [
  { id: 'klussen', label: 'Klussen' },
  { id: 'basis', label: 'Basisuitrusting' },
];

/** Upcoming booked jobs with the state of their packing list. Built for the
 *  phone first — this is the screen you open next to the van. */
export function PackingLists() {
  const [rows, setRows] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const rawPane = searchParams.get('tab');
  const pane: PaneId = (PANES.some((p) => p.id === rawPane) ? rawPane : 'klussen') as PaneId;

  useEffect(() => {
    let alive = true;
    async function load() {
      // Booked or completed jobs from yesterday onward.
      const from = new Date();
      from.setDate(from.getDate() - 1);
      const { data: requests, error } = await supabase
        .from('quote_requests').select('*')
        .in('status', ['booked', 'confirmed', 'completed'])
        .gte('event_date', toDateOnly(from))
        .order('event_date');
      if (!alive) return;
      if (error) { console.error(error); setLoading(false); return; }

      const reqs = (requests ?? []).filter((r) => ['booked', 'completed'].includes(normalizeStatus(r.status)));
      const ids = reqs.map((r) => r.id);
      let listMap = new Map<string, { id: string }>();
      let counts = new Map<string, { total: number; checked: number }>();

      if (ids.length) {
        const { data: lists, error: listErr } = await supabase
          .from('packing_lists').select('id, request_id').in('request_id', ids);
        if (listErr) { if (alive) { setUnavailable(true); setLoading(false); } return; }
        listMap = new Map((lists ?? []).map((l) => [l.request_id, { id: l.id }]));
        const listIds = (lists ?? []).map((l) => l.id);
        if (listIds.length) {
          const { data: items } = await supabase
            .from('packing_list_items').select('list_id, is_checked').in('list_id', listIds);
          const byList = new Map<string, { total: number; checked: number }>();
          for (const item of items ?? []) {
            const entry = byList.get(item.list_id) ?? { total: 0, checked: 0 };
            entry.total += 1;
            if (item.is_checked) entry.checked += 1;
            byList.set(item.list_id, entry);
          }
          counts = new Map((lists ?? []).map((l) => [l.request_id, byList.get(l.id) ?? { total: 0, checked: 0 }]));
        }
      }

      setRows(reqs.map((request) => ({
        request,
        hasList: listMap.has(request.id),
        total: counts.get(request.id)?.total ?? 0,
        checked: counts.get(request.id)?.checked ?? 0,
      })));
      setLoading(false);
    }
    load();
    return () => { alive = false; };
  }, []);

  return (
    <AdminLayout title="Paklijsten">
      <div role="tablist" aria-label="Paklijstweergave" className="mb-6 flex gap-1 border-b border-white/10">
        {PANES.map((p) => {
          const active = pane === p.id;
          return (
            <button
              key={p.id}
              role="tab"
              aria-selected={active}
              onClick={() => setSearchParams(p.id === 'klussen' ? {} : { tab: p.id }, { replace: true })}
              className={`relative -mb-px h-12 shrink-0 px-4 text-[0.9375rem] transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:-outline-offset-2 ${
                active ? 'border-b-2 border-gold text-gold-light' : 'border-b-2 border-transparent text-muted hover:text-white'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {pane === 'basis' ? (
        <SaveStatusProvider>
          <section aria-label="Basisuitrusting" className="rounded-xl border border-white/5 bg-surface-elevated p-5 sm:p-6">
            <PackingTemplateEditor packageId={null} packageName="Basisuitrusting op locatie" />
          </section>
          <SaveBar />
        </SaveStatusProvider>
      ) : loading ? (
        <SkeletonRows rows={3} height="h-20" />
      ) : unavailable ? (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          Paklijsten niet beschikbaar. Voer migratie <code className="font-mono">0005_packing.sql</code> uit in de Supabase SQL-editor.
        </p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-white/5 bg-surface-elevated p-10 text-center text-muted">
          Geen komende geboekte klussen. Zodra een aanvraag op Geboekt staat, verschijnt de klus hier met zijn paklijst.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map(({ request, hasList, total, checked }) => {
            const done = hasList && total > 0 && checked === total;
            return (
              <li key={request.id}>
                <Link
                  to={`/aanvragen/${request.id}?tab=paklijst`}
                  className="flex min-h-[4.5rem] items-center gap-4 rounded-xl border border-white/5 bg-surface-elevated px-5 py-4 transition-colors duration-150 hover:border-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                      <span className="font-medium text-white">{formatDateNL(request.event_date)}</span>
                      <span className="truncate text-[0.9375rem] text-white/85">{request.full_name}</span>
                    </div>
                    <div className="mt-0.5 truncate text-sm text-muted">
                      {request.event_city} · {request.guest_count} gasten · {request.cocktail_count} cocktails
                    </div>
                    {hasList && total > 0 && (
                      <div className="mt-2 h-1.5 max-w-xs overflow-hidden rounded-full bg-white/10">
                        <div
                          className={`h-full rounded-full ${done ? 'bg-ok' : 'bg-gold'}`}
                          style={{ width: `${(checked / total) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium uppercase tracking-wide ${
                    !hasList ? 'border-danger/30 bg-danger/10 text-danger'
                    : done ? 'border-ok/40 bg-ok/20 text-ok'
                    : 'border-gold/30 bg-gold/15 text-gold-light'
                  }`}>
                    {!hasList ? 'Nog geen lijst' : done ? 'Compleet' : `${checked}/${total}`}
                  </span>
                  <IconChevronRight size={18} className="shrink-0 text-muted" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AdminLayout>
  );
}
