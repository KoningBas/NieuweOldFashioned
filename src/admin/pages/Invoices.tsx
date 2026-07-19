import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../shared/lib/supabase';
import { AdminLayout } from '../layout/AdminLayout';
import { SkeletonRows } from '../components/Skeleton';
import { IconCheck, IconPrinter } from '../components/icons';
import { invalidateNavCounts } from '../layout/navCounts';
import { logActivity } from '../lib/activity';
import { formatDateNL, formatEuro, toDateOnly } from '../../shared/lib/format';
import type { Invoice } from '../../shared/types/db';

type Filter = 'open' | 'betaald' | 'alle';

export function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<Filter>('open');
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      const { data, error } = await supabase.from('invoices').select('*').order('invoice_number', { ascending: false });
      if (!alive) return;
      if (error) { setUnavailable(true); setLoading(false); return; }
      setInvoices(data ?? []);
      setLoading(false);
      const ids = [...new Set((data ?? []).map((i) => i.request_id))];
      if (ids.length) {
        const { data: reqs } = await supabase.from('quote_requests').select('id, full_name').in('id', ids);
        if (alive && reqs) setNames(Object.fromEntries(reqs.map((r) => [r.id, r.full_name])));
      }
    }
    load();
    return () => { alive = false; };
  }, []);

  const today = toDateOnly(new Date());
  const counts = useMemo(() => ({
    open: invoices.filter((i) => !i.paid_on).length,
    betaald: invoices.filter((i) => i.paid_on).length,
    alle: invoices.length,
  }), [invoices]);

  const visible = useMemo(() => {
    if (filter === 'open') return invoices.filter((i) => !i.paid_on);
    if (filter === 'betaald') return invoices.filter((i) => i.paid_on);
    return invoices;
  }, [invoices, filter]);

  async function markPaid(inv: Invoice) {
    const paidOn = toDateOnly(new Date());
    setInvoices((prev) => prev.map((i) => (i.id === inv.id ? { ...i, paid_on: paidOn } : i)));
    const { error } = await supabase.from('invoices').update({ paid_on: paidOn }).eq('id', inv.id);
    if (error) {
      console.error('Failed to mark paid', error);
      setInvoices((prev) => prev.map((i) => (i.id === inv.id ? { ...i, paid_on: null } : i)));
      return;
    }
    await supabase.from('quote_requests').update({ status: 'paid' }).eq('id', inv.request_id);
    await logActivity(inv.request_id, 'system', `Factuur ${inv.invoice_number} betaald`);
    invalidateNavCounts();
  }

  return (
    <AdminLayout title="Facturen">
      <div className="mb-6 inline-flex gap-1 rounded-xl border border-white/10 bg-surface-elevated p-1" role="tablist" aria-label="Filter facturen">
        {(['open', 'betaald', 'alle'] as Filter[]).map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm capitalize transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2 ${
              filter === f ? 'bg-gold font-medium text-surface' : 'text-muted hover:text-white'
            }`}
          >
            {f}
            <span className={`rounded-full px-1.5 text-xs ${filter === f ? 'bg-surface/20 text-surface' : 'bg-white/10 text-muted'}`}>{counts[f]}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonRows rows={4} />
      ) : unavailable ? (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          Facturen niet beschikbaar. Voer migratie <code className="font-mono">0004_quotes_invoices.sql</code> uit in de Supabase SQL-editor.
        </p>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-white/5 bg-surface-elevated p-10 text-center text-muted">
          {invoices.length === 0
            ? 'Nog geen facturen. Maak er een via het Factuur-tabblad van een uitgevoerde klus.'
            : 'Geen facturen binnen dit filter.'}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/5 bg-surface-elevated">
          <div className="hidden gap-4 border-b border-white/5 px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted md:grid md:grid-cols-[7rem_minmax(0,1.5fr)_1fr_1fr_0.9fr_1fr_auto]">
            <span>Nummer</span><span>Klant</span><span>Datum</span><span>Vervalt</span>
            <span className="text-right">Bedrag</span><span>Status</span><span className="w-24" aria-hidden="true" />
          </div>
          <ul>
            {visible.map((inv) => {
              const overdue = !inv.paid_on && inv.due_on < today;
              return (
                <li key={inv.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-white/5 px-5 py-4 last:border-b-0 md:grid-cols-[7rem_minmax(0,1.5fr)_1fr_1fr_0.9fr_1fr_auto]">
                  <span className="font-medium text-white md:order-none">
                    <Link
                      to={`/aanvragen/${inv.request_id}?tab=factuur`}
                      className="rounded transition-colors hover:text-gold-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
                    >
                      {inv.invoice_number}
                    </Link>
                    <span className="block truncate text-sm font-normal text-muted md:hidden">
                      {names[inv.request_id] ?? '—'} · vervalt {formatDateNL(inv.due_on)}
                    </span>
                  </span>
                  <span className="hidden truncate text-[0.9375rem] text-white/85 md:block">{names[inv.request_id] ?? '—'}</span>
                  <span className="hidden text-[0.9375rem] text-white/85 md:block">{formatDateNL(inv.issued_on)}</span>
                  <span className={`hidden text-[0.9375rem] md:block ${overdue ? 'font-medium text-danger' : 'text-white/85'}`}>{formatDateNL(inv.due_on)}</span>
                  <span className="hidden text-right text-[0.9375rem] font-medium text-white md:block">{formatEuro(inv.total_incl)}</span>
                  <span className="row-start-1 col-start-2 justify-self-end md:row-auto md:col-auto md:justify-self-start">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium uppercase tracking-wide ${
                      inv.paid_on ? 'border-ok/40 bg-ok/20 text-ok' : overdue ? 'border-danger/30 bg-danger/10 text-danger' : 'border-gold/30 bg-gold/15 text-gold-light'
                    }`}>
                      {inv.paid_on ? 'Betaald' : overdue ? 'Te laat' : 'Open'}
                    </span>
                  </span>
                  <span className="col-start-2 row-start-2 flex gap-1.5 justify-self-end md:col-auto md:row-auto">
                    <a
                      href={`/admin/print/factuur/${inv.id}`}
                      target="_blank"
                      rel="noopener"
                      aria-label={`Print factuur ${inv.invoice_number}`}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-muted transition-colors duration-150 hover:border-white/25 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
                    >
                      <IconPrinter size={15} />
                    </a>
                    {!inv.paid_on && (
                      <button
                        onClick={() => markPaid(inv)}
                        aria-label={`Markeer factuur ${inv.invoice_number} als betaald`}
                        className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-ok/40 bg-ok/15 px-3 text-sm font-medium text-ok transition-colors duration-150 hover:bg-ok/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-2"
                      >
                        <IconCheck size={14} /> Betaald
                      </button>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </AdminLayout>
  );
}
