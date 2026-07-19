import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../shared/lib/supabase';
import { logActivity } from '../../lib/activity';
import { invalidateNavCounts } from '../../layout/navCounts';
import { SkeletonBlock } from '../../components/Skeleton';
import { IconCheck, IconPrinter } from '../../components/icons';
import { formatDateNL, formatEuro, toDateOnly } from '../../../shared/lib/format';
import { documentTotals, lineTotalIncl } from '../../../shared/lib/money';
import { prefillQuoteLines } from '../../../shared/lib/documents';
import type { Invoice, InvoiceLine, QuoteRequest, QuoteStatus } from '../../../shared/types/db';

interface Props {
  request: QuoteRequest;
  onLogged: () => void;
  onStatusChanged: (s: QuoteStatus) => void;
}

/** The invoice is a frozen copy of the quote at invoicing time. After
 *  creation the lines are read-only — an issued invoice never changes. */
export function InvoiceTab({ request, onLogged, onStatusChanged }: Props) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totals = useMemo(() => documentTotals(lines), [lines]);

  useEffect(() => {
    let alive = true;
    async function load() {
      const { data: inv, error: invErr } = await supabase
        .from('invoices').select('*').eq('request_id', request.id)
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (!alive) return;
      if (invErr) { setError('Facturen niet beschikbaar. Voer migratie 0004_quotes_invoices.sql uit.'); setLoading(false); return; }
      if (inv) {
        setInvoice(inv);
        const { data: l } = await supabase.from('invoice_lines').select('*').eq('invoice_id', inv.id).order('sort_order');
        if (alive) setLines(l ?? []);
      }
      setLoading(false);
    }
    load();
    return () => { alive = false; };
  }, [request.id]);

  async function createInvoice() {
    setBusy(true);
    setError(null);
    try {
      // Copy the latest quote's lines; fall back to a fresh prefill when the
      // job was booked without a quote in the system.
      const { data: quote } = await supabase
        .from('quotes').select('*').eq('request_id', request.id)
        .order('version', { ascending: false }).limit(1).maybeSingle();

      let sourceLines: Omit<InvoiceLine, 'id' | 'invoice_id'>[];
      if (quote) {
        const { data: ql } = await supabase.from('quote_lines').select('*').eq('quote_id', quote.id).order('sort_order');
        sourceLines = (ql ?? []).map(({ id: _i, quote_id: _q, ...rest }) => rest);
      } else {
        const [pkgRes, setRes] = await Promise.all([
          supabase.from('service_packages').select('package_name, price, price_unit').eq('id', request.package_id).single(),
          supabase.from('service_settings').select('*').limit(1).single(),
        ]);
        if (pkgRes.error || setRes.error) throw (pkgRes.error ?? setRes.error);
        sourceLines = prefillQuoteLines(request, pkgRes.data, setRes.data);
      }

      const { data: settings } = await supabase.from('service_settings').select('invoice_due_days').limit(1).single();
      const { data: num, error: numErr } = await supabase.rpc('next_document_number', { p_kind: 'invoice', p_year: new Date().getFullYear() });
      if (numErr) throw numErr;

      const due = new Date();
      due.setDate(due.getDate() + (settings?.invoice_due_days ?? 14));

      const { data: inv, error: insErr } = await supabase.from('invoices').insert({
        request_id: request.id,
        quote_id: quote?.id ?? null,
        invoice_number: num as string,
        due_on: toDateOnly(due),
        total_incl: documentTotals(sourceLines).totalIncl,
      }).select().single();
      if (insErr || !inv) throw insErr;

      const { data: il, error: lineErr } = await supabase.from('invoice_lines')
        .insert(sourceLines.map((l) => ({ ...l, invoice_id: inv.id })))
        .select();
      if (lineErr) throw lineErr;

      setInvoice(inv);
      setLines((il ?? []).sort((a, b) => a.sort_order - b.sort_order));

      await supabase.from('quote_requests').update({ status: 'invoiced' }).eq('id', request.id);
      onStatusChanged('invoiced');
      await logActivity(request.id, 'system', `Factuur ${inv.invoice_number} aangemaakt (${formatEuro(inv.total_incl)})`);
      invalidateNavCounts();
      onLogged();
    } catch (e) {
      console.error('Failed to create invoice', e);
      setError('Factuur aanmaken mislukt. Is migratie 0003 + 0004 uitgevoerd?');
    } finally {
      setBusy(false);
    }
  }

  async function markPaid() {
    if (!invoice) return;
    setBusy(true);
    const today = toDateOnly(new Date());
    const { error: err } = await supabase.from('invoices').update({ paid_on: today }).eq('id', invoice.id);
    if (!err) {
      setInvoice({ ...invoice, paid_on: today });
      await supabase.from('quote_requests').update({ status: 'paid' }).eq('id', request.id);
      onStatusChanged('paid');
      await logActivity(request.id, 'system', `Factuur ${invoice.invoice_number} betaald`);
      invalidateNavCounts();
      onLogged();
    }
    setBusy(false);
  }

  if (loading) return <SkeletonBlock className="h-40" />;

  if (error && !invoice) {
    return <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>;
  }

  if (!invoice) {
    return (
      <div className="rounded-xl border border-white/5 bg-surface-elevated p-8 text-center">
        <p className="mb-1 text-white/85">Nog geen factuur voor deze klus.</p>
        <p className="mb-5 text-sm text-muted">De factuur kopieert de offerteregels van dit moment en staat daarna vast.</p>
        <button
          onClick={createInvoice}
          disabled={busy}
          className="h-11 rounded-lg bg-gold px-6 text-[0.9375rem] font-medium text-surface transition-colors duration-200 hover:bg-gold-light disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
        >
          {busy ? 'Aanmaken…' : 'Factuur maken'}
        </button>
        {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      </div>
    );
  }

  const overdue = !invoice.paid_on && invoice.due_on < toDateOnly(new Date());

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="font-heading text-xl text-white">{invoice.invoice_number}</span>
        <span className={`rounded-full border px-2.5 py-1 text-xs font-medium uppercase tracking-wide ${
          invoice.paid_on ? 'border-ok/40 bg-ok/20 text-ok'
          : overdue ? 'border-danger/30 bg-danger/10 text-danger'
          : 'border-gold/30 bg-gold/15 text-gold-light'
        }`}>
          {invoice.paid_on ? `Betaald ${formatDateNL(invoice.paid_on)}` : overdue ? 'Over termijn' : 'Open'}
        </span>
        <span className="text-sm text-muted">verstuurd {formatDateNL(invoice.issued_on)} · vervalt {formatDateNL(invoice.due_on)}</span>

        <div className="ml-auto flex flex-wrap gap-2">
          <a
            href={`/admin/print/factuur/${invoice.id}`}
            target="_blank"
            rel="noopener"
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/15 px-4 text-[0.9375rem] text-white/85 transition-colors duration-200 hover:border-white/30 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
          >
            <IconPrinter size={16} /> Voorbeeld
          </a>
          {!invoice.paid_on && (
            <button
              onClick={markPaid}
              disabled={busy}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-ok/40 bg-ok/15 px-5 text-[0.9375rem] font-medium text-ok transition-colors duration-200 hover:bg-ok/25 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-2"
            >
              <IconCheck size={16} /> Markeer als betaald
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/5 bg-surface-elevated">
        <table className="w-full min-w-[34rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-muted">
              <th className="px-4 py-3 font-medium">Omschrijving</th>
              <th className="w-24 px-2 py-3 text-right font-medium">Aantal</th>
              <th className="w-28 px-2 py-3 font-medium">Eenheid</th>
              <th className="w-32 px-2 py-3 text-right font-medium">Prijs incl.</th>
              <th className="w-32 px-4 py-3 text-right font-medium">Totaal</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id} className="border-b border-white/5 last:border-b-0">
                <td className="px-4 py-3 text-[0.9375rem] text-white">{l.description}</td>
                <td className="px-2 py-3 text-right text-[0.9375rem] text-white/85">{l.quantity}</td>
                <td className="px-2 py-3 text-[0.9375rem] text-muted">{l.unit}</td>
                <td className="px-2 py-3 text-right text-[0.9375rem] text-white/85">{formatEuro(l.unit_price_incl)}</td>
                <td className="px-4 py-3 text-right text-[0.9375rem] font-medium text-white">{formatEuro(lineTotalIncl(l))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ml-auto w-full max-w-xs rounded-xl border border-white/5 bg-surface-elevated p-5">
        <dl className="flex flex-col gap-2 text-[0.9375rem]">
          <div className="flex justify-between text-muted"><dt>Subtotaal excl. btw</dt><dd>{formatEuro(totals.totalEx)}</dd></div>
          {totals.groups.map((g) => (
            <div key={g.rate} className="flex justify-between text-muted"><dt>Btw {g.rate}%</dt><dd>{formatEuro(g.vat)}</dd></div>
          ))}
          <div className="mt-1 flex justify-between border-t border-white/10 pt-3 text-lg font-medium text-white">
            <dt>Totaal incl. btw</dt>
            <dd className="font-heading text-gold-light">{formatEuro(totals.totalIncl)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
