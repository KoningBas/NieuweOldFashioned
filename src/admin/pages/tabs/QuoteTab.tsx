import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../shared/lib/supabase';
import { logActivity } from '../../lib/activity';
import { SkeletonBlock } from '../../components/Skeleton';
import { CELL_INPUT_CLS } from '../../components/Form';
import { IconPlus, IconPrinter, IconTrash } from '../../components/icons';
import { formatDateNL, formatEuro, toDateOnly } from '../../../shared/lib/format';
import { documentTotals, lineTotalIncl, round2 } from '../../../shared/lib/money';
import { prefillQuoteLines } from '../../../shared/lib/documents';
import { isTransitionAllowed } from '../../../shared/lib/workflow';
import type { Quote, QuoteLine, QuoteRequest, QuoteStatus } from '../../../shared/types/db';

interface Props {
  request: QuoteRequest;
  packageName: string;
  onLogged: () => void;
  onStatusChanged: (s: QuoteStatus) => void;
}

const DOC_STATUS_LABELS: Record<Quote['status'], string> = {
  draft: 'Concept', sent: 'Verstuurd', accepted: 'Geaccepteerd', declined: 'Afgewezen', expired: 'Verlopen',
};

export function QuoteTab({ request, packageName, onLogged, onStatusChanged }: Props) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editable = quote?.status === 'draft';
  const totals = useMemo(() => documentTotals(lines), [lines]);

  useEffect(() => {
    let alive = true;
    async function load() {
      const { data: q, error: qErr } = await supabase
        .from('quotes').select('*')
        .eq('request_id', request.id)
        .order('version', { ascending: false })
        .limit(1).maybeSingle();
      if (!alive) return;
      if (qErr) { setError('Offertes niet beschikbaar. Voer migratie 0004_quotes_invoices.sql uit.'); setLoading(false); return; }
      if (q) {
        setQuote(q);
        const { data: l } = await supabase.from('quote_lines').select('*').eq('quote_id', q.id).order('sort_order');
        if (alive) setLines(l ?? []);
      }
      setLoading(false);
    }
    load();
    return () => { alive = false; };
  }, [request.id]);

  async function syncTotal(quoteId: string, nextLines: QuoteLine[]) {
    const t = documentTotals(nextLines).totalIncl;
    setQuote((q) => (q ? { ...q, total_incl: t } : q));
    await supabase.from('quotes').update({ total_incl: t }).eq('id', quoteId);
  }

  async function createQuote() {
    setBusy(true);
    setError(null);
    try {
      const [pkgRes, setRes, numRes] = await Promise.all([
        supabase.from('service_packages').select('package_name, price, price_unit').eq('id', request.package_id).single(),
        supabase.from('service_settings').select('*').limit(1).single(),
        supabase.rpc('next_document_number', { p_kind: 'quote', p_year: new Date().getFullYear() }),
      ]);
      if (pkgRes.error || setRes.error || numRes.error) throw (pkgRes.error ?? setRes.error ?? numRes.error);

      const settings = setRes.data;
      const prefill = prefillQuoteLines(request, pkgRes.data, settings);
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + (settings.quote_valid_days ?? 14));

      const { data: q, error: insErr } = await supabase.from('quotes').insert({
        request_id: request.id,
        quote_number: numRes.data as string,
        valid_until: toDateOnly(validUntil),
        total_incl: documentTotals(prefill).totalIncl,
      }).select().single();
      if (insErr || !q) throw insErr;

      const { data: l, error: lineErr } = await supabase.from('quote_lines')
        .insert(prefill.map((p) => ({ ...p, quote_id: q.id })))
        .select();
      if (lineErr) throw lineErr;

      setQuote(q);
      setLines((l ?? []).sort((a, b) => a.sort_order - b.sort_order));
      await logActivity(request.id, 'system', `Offerte ${q.quote_number} aangemaakt`);
      onLogged();
    } catch (e) {
      console.error('Failed to create quote', e);
      setError('Offerte aanmaken mislukt. Is migratie 0003 + 0004 uitgevoerd?');
    } finally {
      setBusy(false);
    }
  }

  function patchLine(id: string, patch: Partial<QuoteLine>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  async function saveLine(id: string) {
    if (!quote) return;
    const line = lines.find((l) => l.id === id);
    if (!line) return;
    const { error: err } = await supabase.from('quote_lines').update({
      description: line.description,
      quantity: line.quantity,
      unit: line.unit,
      unit_price_incl: line.unit_price_incl,
    }).eq('id', id);
    if (err) { console.error('Failed to save line', err); return; }
    await syncTotal(quote.id, lines);
  }

  async function addLine() {
    if (!quote) return;
    const sort = lines.length ? Math.max(...lines.map((l) => l.sort_order)) + 1 : 0;
    const { data, error: err } = await supabase.from('quote_lines').insert({
      quote_id: quote.id, description: '', quantity: 1, unit: 'st', unit_price_incl: 0,
      vat_rate: lines[0]?.vat_rate ?? 21, sort_order: sort,
    }).select().single();
    if (err || !data) { console.error('Failed to add line', err); return; }
    setLines((prev) => [...prev, data]);
  }

  async function removeLine(id: string) {
    if (!quote) return;
    const next = lines.filter((l) => l.id !== id);
    setLines(next);
    const { error: err } = await supabase.from('quote_lines').delete().eq('id', id);
    if (err) { console.error('Failed to delete line', err); return; }
    await syncTotal(quote.id, next);
  }

  async function markSent() {
    if (!quote) return;
    setBusy(true);
    const { error: err } = await supabase.from('quotes')
      .update({ status: 'sent', sent_at: new Date().toISOString(), total_incl: totals.totalIncl })
      .eq('id', quote.id);
    if (!err) {
      setQuote({ ...quote, status: 'sent', sent_at: new Date().toISOString(), total_incl: totals.totalIncl });
      if (isTransitionAllowed(request.status, 'quoted')) {
        await supabase.from('quote_requests').update({ status: 'quoted' }).eq('id', request.id);
        onStatusChanged('quoted');
      }
      await logActivity(request.id, 'system', `Offerte ${quote.quote_number} gemarkeerd als verstuurd (${formatEuro(totals.totalIncl)})`);
      onLogged();
    }
    setBusy(false);
  }

  async function customerAccepted() {
    if (!quote) return;
    setBusy(true);
    await supabase.from('quotes').update({ status: 'accepted', accepted_at: new Date().toISOString() }).eq('id', quote.id);
    setQuote({ ...quote, status: 'accepted', accepted_at: new Date().toISOString() });
    await supabase.from('quote_requests').update({ status: 'booked' }).eq('id', request.id);
    onStatusChanged('booked');
    await logActivity(request.id, 'system', `Klant akkoord met offerte ${quote.quote_number} — geboekt`);
    onLogged();
    setBusy(false);
  }

  async function customerDeclined() {
    if (!quote) return;
    setBusy(true);
    await supabase.from('quotes').update({ status: 'declined' }).eq('id', quote.id);
    setQuote({ ...quote, status: 'declined' });
    await supabase.from('quote_requests').update({ status: 'declined' }).eq('id', request.id);
    onStatusChanged('declined');
    await logActivity(request.id, 'system', `Klant heeft offerte ${quote.quote_number} afgewezen`);
    onLogged();
    setBusy(false);
  }

  async function newVersion() {
    if (!quote) return;
    setBusy(true);
    const { data: q, error: err } = await supabase.from('quotes').insert({
      request_id: request.id,
      quote_number: quote.quote_number,
      version: quote.version + 1,
      valid_until: quote.valid_until,
      total_incl: quote.total_incl,
    }).select().single();
    if (!err && q) {
      await supabase.from('quote_lines').insert(lines.map(({ id: _id, quote_id: _q, ...rest }) => ({ ...rest, quote_id: q.id })));
      const { data: l } = await supabase.from('quote_lines').select('*').eq('quote_id', q.id).order('sort_order');
      setQuote(q);
      setLines(l ?? []);
      await logActivity(request.id, 'system', `Nieuwe versie van offerte ${q.quote_number} (v${q.version})`);
      onLogged();
    }
    setBusy(false);
  }

  if (loading) return <SkeletonBlock className="h-40" />;

  if (error && !quote) {
    return <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>;
  }

  if (!quote) {
    return (
      <div className="rounded-xl border border-white/5 bg-surface-elevated p-8 text-center">
        <p className="mb-1 text-white/85">Nog geen offerte voor deze aanvraag.</p>
        <p className="mb-5 text-sm text-muted">
          Regels worden vooraf ingevuld op basis van {packageName || 'het pakket'}, de aantallen en de reisafstand. Daarna vrij aan te passen.
        </p>
        <button
          onClick={createQuote}
          disabled={busy}
          className="h-11 rounded-lg bg-gold px-6 text-[0.9375rem] font-medium text-surface transition-colors duration-200 hover:bg-gold-light disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
        >
          {busy ? 'Aanmaken…' : 'Offerte maken'}
        </button>
        {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      </div>
    );
  }

  const inputCls = CELL_INPUT_CLS;

  return (
    <div className="flex flex-col gap-5">
      {/* Document header row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="font-heading text-xl text-white">{quote.quote_number}</span>
        {quote.version > 1 && <span className="text-sm text-muted">versie {quote.version}</span>}
        <span className={`rounded-full border px-2.5 py-1 text-xs font-medium uppercase tracking-wide ${
          quote.status === 'draft' ? 'border-white/20 bg-white/10 text-white/80'
          : quote.status === 'sent' ? 'border-gold/30 bg-gold/15 text-gold-light'
          : quote.status === 'accepted' ? 'border-ok/30 bg-ok/15 text-ok'
          : 'border-danger/30 bg-danger/10 text-danger'
        }`}>{DOC_STATUS_LABELS[quote.status]}</span>
        <span className="text-sm text-muted">geldig tot {formatDateNL(quote.valid_until)}</span>

        <div className="ml-auto flex flex-wrap gap-2">
          <a
            href={`/admin/print/offerte/${quote.id}`}
            target="_blank"
            rel="noopener"
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/15 px-4 text-[0.9375rem] text-white/85 transition-colors duration-200 hover:border-white/30 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
          >
            <IconPrinter size={16} /> Voorbeeld
          </a>
          {quote.status === 'draft' && (
            <button
              onClick={markSent}
              disabled={busy || lines.length === 0}
              className="h-11 rounded-lg bg-gold px-5 text-[0.9375rem] font-medium text-surface transition-colors duration-200 hover:bg-gold-light disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
            >
              Markeren als verstuurd
            </button>
          )}
          {quote.status === 'sent' && (
            <>
              <button onClick={customerAccepted} disabled={busy} className="h-11 rounded-lg border border-ok/40 bg-ok/15 px-4 text-[0.9375rem] font-medium text-ok transition-colors duration-200 hover:bg-ok/25 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-2">
                Klant akkoord
              </button>
              <button onClick={customerDeclined} disabled={busy} className="h-11 rounded-lg border border-danger/30 px-4 text-[0.9375rem] text-danger transition-colors duration-200 hover:bg-danger/10 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-danger focus-visible:outline-offset-2">
                Klant wijst af
              </button>
            </>
          )}
          {(quote.status === 'sent' || quote.status === 'accepted' || quote.status === 'declined') && (
            <button onClick={newVersion} disabled={busy} className="h-11 rounded-lg border border-white/15 px-4 text-[0.9375rem] text-white/85 transition-colors duration-200 hover:border-white/30 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2">
              Nieuwe versie
            </button>
          )}
        </div>
      </div>

      {/* Lines table */}
      <div className="overflow-x-auto rounded-xl border border-white/5 bg-surface-elevated">
        <table className="w-full min-w-[38rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-muted">
              <th className="px-4 py-3 font-medium">Omschrijving</th>
              <th className="w-24 px-2 py-3 font-medium text-right">Aantal</th>
              <th className="w-28 px-2 py-3 font-medium">Eenheid</th>
              <th className="w-32 px-2 py-3 font-medium text-right">Prijs incl.</th>
              <th className="w-32 px-4 py-3 font-medium text-right">Totaal</th>
              {editable && <th className="w-14 px-2 py-3"><span className="sr-only">Verwijder</span></th>}
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id} className="border-b border-white/5 last:border-b-0">
                <td className="px-2 py-1.5">
                  <input
                    aria-label="Omschrijving" disabled={!editable} value={l.description}
                    onChange={(e) => patchLine(l.id, { description: e.target.value })}
                    onBlur={() => saveLine(l.id)} placeholder="Omschrijving…"
                    className={inputCls}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    aria-label="Aantal" type="number" min="0" step="1" disabled={!editable} value={l.quantity}
                    onChange={(e) => patchLine(l.id, { quantity: Number(e.target.value) })}
                    onBlur={() => saveLine(l.id)}
                    className={`${inputCls} text-right`}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    aria-label="Eenheid" disabled={!editable} value={l.unit}
                    onChange={(e) => patchLine(l.id, { unit: e.target.value })}
                    onBlur={() => saveLine(l.id)}
                    className={inputCls}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    aria-label="Prijs per stuk inclusief btw" type="number" min="0" step="0.01" disabled={!editable} value={l.unit_price_incl}
                    onChange={(e) => patchLine(l.id, { unit_price_incl: Number(e.target.value) })}
                    onBlur={() => saveLine(l.id)}
                    className={`${inputCls} text-right`}
                  />
                </td>
                <td className="px-4 py-1.5 text-right text-[0.9375rem] font-medium text-white">{formatEuro(lineTotalIncl(l))}</td>
                {editable && (
                  <td className="px-2 py-1.5 text-center">
                    <button
                      onClick={() => removeLine(l.id)}
                      aria-label={`Verwijder regel ${l.description || 'zonder omschrijving'}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:bg-danger/10 hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-danger focus-visible:outline-offset-2"
                    >
                      <IconTrash size={15} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {editable && (
          <button
            onClick={addLine}
            className="flex h-12 w-full items-center gap-2 border-t border-white/5 px-4 text-[0.9375rem] text-muted transition-colors duration-200 hover:bg-white/[0.03] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold-light"
          >
            <IconPlus size={16} /> Regel toevoegen
          </button>
        )}
      </div>

      {/* Totals + VAT specification */}
      <div className="ml-auto w-full max-w-xs rounded-xl border border-white/5 bg-surface-elevated p-5">
        <dl className="flex flex-col gap-2 text-[0.9375rem]">
          <div className="flex justify-between text-muted">
            <dt>Subtotaal excl. btw</dt>
            <dd>{formatEuro(totals.totalEx)}</dd>
          </div>
          {totals.groups.map((g) => (
            <div key={g.rate} className="flex justify-between text-muted">
              <dt>Btw {g.rate}%</dt>
              <dd>{formatEuro(g.vat)}</dd>
            </div>
          ))}
          <div className="mt-1 flex justify-between border-t border-white/10 pt-3 text-lg font-medium text-white">
            <dt>Totaal incl. btw</dt>
            <dd className="font-heading text-gold-light">{formatEuro(round2(totals.totalIncl))}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
