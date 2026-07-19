import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../shared/lib/supabase';
import { formatEuro } from '../../shared/lib/format';
import { documentTotals, lineTotalIncl } from '../../shared/lib/money';
import { IconPrinter } from '../components/icons';
import type { Invoice, InvoiceLine, Quote, QuoteLine, QuoteRequest, ServiceSettings } from '../../shared/types/db';

const NL_LONG = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
const fmtDate = (d: string) => NL_LONG.format(new Date(`${d}T00:00:00`));

interface Doc {
  number: string;
  issuedOn: string;
  deadline: string;
  lines: (QuoteLine | InvoiceLine)[];
  request: QuoteRequest;
  settings: ServiceSettings;
}

/** A4 print view for quote and invoice. Always light — this goes to paper.
 *  Ctrl+P (or the button) gives a clean PDF; buttons carry .no-print. */
export function PrintDocument({ kind }: { kind: 'quote' | 'invoice' }) {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [failed, setFailed] = useState(false);

  // Force the light theme while this page is open; restore afterwards.
  useEffect(() => {
    const previous = document.documentElement.dataset.theme;
    document.documentElement.dataset.theme = 'light';
    return () => { document.documentElement.dataset.theme = previous; };
  }, []);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    async function load() {
      const table = kind === 'quote' ? 'quotes' : 'invoices';
      const lineTable = kind === 'quote' ? 'quote_lines' : 'invoice_lines';
      const fk = kind === 'quote' ? 'quote_id' : 'invoice_id';

      const { data: record, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
      if (!alive || error || !record) { if (alive) setFailed(true); return; }

      const [linesRes, reqRes, setRes] = await Promise.all([
        supabase.from(lineTable).select('*').eq(fk, id).order('sort_order'),
        supabase.from('quote_requests').select('*').eq('id', record.request_id).single(),
        supabase.from('service_settings').select('*').limit(1).single(),
      ]);
      if (!alive) return;
      if (reqRes.error || setRes.error) { setFailed(true); return; }

      setDoc({
        number: kind === 'quote' ? (record as Quote).quote_number : (record as Invoice).invoice_number,
        issuedOn: kind === 'quote' ? (record as Quote).created_at.slice(0, 10) : (record as Invoice).issued_on,
        deadline: kind === 'quote' ? (record as Quote).valid_until : (record as Invoice).due_on,
        lines: linesRes.data ?? [],
        request: reqRes.data,
        settings: setRes.data,
      });
    }
    load();
    return () => { alive = false; };
  }, [id, kind]);

  const totals = useMemo(() => documentTotals(doc?.lines ?? []), [doc]);

  if (failed) {
    return <div className="mx-auto max-w-2xl p-12 text-center text-muted">Document niet gevonden.</div>;
  }
  if (!doc) {
    return <div className="mx-auto max-w-2xl p-12 text-center text-muted">Laden…</div>;
  }

  const { request, settings } = doc;
  const title = kind === 'quote' ? 'Offerte' : 'Factuur';

  return (
    <div className="min-h-screen bg-surface text-white print:bg-[#fff]">
      <div className="mx-auto max-w-[46rem] px-8 py-10 print:px-0 print:py-0">
        {/* Screen-only toolbar */}
        <div className="no-print mb-8 flex justify-end">
          <button
            onClick={() => window.print()}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-gold px-5 text-[0.9375rem] font-medium text-surface transition-colors duration-200 hover:bg-gold-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
          >
            <IconPrinter size={16} /> Afdrukken / opslaan als PDF
          </button>
        </div>

        {/* Letterhead — the one place the brand serif belongs in the admin */}
        <header className="flex items-start justify-between gap-8 border-b-2 border-gold pb-6">
          <div>
            <div className="font-heading text-3xl leading-tight">{settings.business_name || 'The Old Fashioned'}</div>
            <div className="mt-1 text-sm text-muted">Cocktails op locatie</div>
          </div>
          <div className="text-right text-xs leading-relaxed text-muted">
            {settings.business_address && <div>{settings.business_address}</div>}
            {settings.business_email && <div>{settings.business_email}</div>}
            {settings.business_phone && <div>{settings.business_phone}</div>}
            {settings.kvk_number && <div>KVK {settings.kvk_number}</div>}
            {settings.vat_number && <div>Btw {settings.vat_number}</div>}
            {settings.iban && <div>{settings.iban}</div>}
          </div>
        </header>

        {/* Document meta + customer */}
        <section className="mt-8 flex flex-wrap items-start justify-between gap-8">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted">Aan</div>
            <div className="mt-1 text-[0.9375rem] leading-relaxed">
              <div className="font-medium">{request.full_name}</div>
              {request.event_address && <div>{request.event_address}</div>}
              <div>{request.event_postcode} {request.event_city}</div>
              <div className="text-muted">{request.email}</div>
            </div>
          </div>
          <div className="text-right">
            <h1 className="font-heading text-2xl">{title} {doc.number}</h1>
            <dl className="mt-2 text-sm leading-relaxed text-muted">
              <div><dt className="inline">Datum: </dt><dd className="inline text-white/90">{fmtDate(doc.issuedOn)}</dd></div>
              <div>
                <dt className="inline">{kind === 'quote' ? 'Geldig tot: ' : 'Vervaldatum: '}</dt>
                <dd className="inline text-white/90">{fmtDate(doc.deadline)}</dd>
              </div>
              <div><dt className="inline">Evenement: </dt><dd className="inline text-white/90">{request.event_type}, {fmtDate(request.event_date)}</dd></div>
            </dl>
          </div>
        </section>

        {/* Lines */}
        <table className="mt-8 w-full border-collapse text-left text-[0.9375rem]">
          <thead>
            <tr className="border-b border-white/25 text-xs uppercase tracking-wider text-muted">
              <th className="py-2 pr-3 font-medium">Omschrijving</th>
              <th className="w-20 py-2 pr-3 text-right font-medium">Aantal</th>
              <th className="w-24 py-2 pr-3 font-medium">Eenheid</th>
              <th className="w-28 py-2 pr-3 text-right font-medium">Prijs</th>
              <th className="w-28 py-2 text-right font-medium">Totaal</th>
            </tr>
          </thead>
          <tbody>
            {doc.lines.map((l) => (
              <tr key={l.id} className="border-b border-white/10">
                <td className="py-2.5 pr-3">{l.description}</td>
                <td className="py-2.5 pr-3 text-right">{l.quantity}</td>
                <td className="py-2.5 pr-3 text-muted">{l.unit}</td>
                <td className="py-2.5 pr-3 text-right">{formatEuro(l.unit_price_incl)}</td>
                <td className="py-2.5 text-right font-medium">{formatEuro(lineTotalIncl(l))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="mt-6 ml-auto w-64">
          <dl className="flex flex-col gap-1.5 text-[0.9375rem]">
            <div className="flex justify-between text-muted"><dt>Subtotaal excl. btw</dt><dd>{formatEuro(totals.totalEx)}</dd></div>
            {totals.groups.map((g) => (
              <div key={g.rate} className="flex justify-between text-muted"><dt>Btw {g.rate}%</dt><dd>{formatEuro(g.vat)}</dd></div>
            ))}
            <div className="mt-1 flex justify-between border-t-2 border-gold pt-2 text-lg font-semibold">
              <dt>Totaal</dt><dd>{formatEuro(totals.totalIncl)}</dd>
            </div>
          </dl>
        </div>

        {/* Footer terms */}
        <footer className="mt-10 border-t border-white/15 pt-5 text-sm leading-relaxed text-muted">
          {kind === 'quote' ? (
            <p>
              Deze offerte is geldig tot {fmtDate(doc.deadline)}. Alle bedragen zijn inclusief btw.
              Akkoord? Reageer op de e-mail of bel {settings.business_phone || 'ons'} — dan leggen wij de datum definitief vast.
            </p>
          ) : (
            <p>
              Graag het totaalbedrag vóór {fmtDate(doc.deadline)} overmaken op {settings.iban || '—'} t.n.v. {settings.business_name},
              onder vermelding van {doc.number}. Alle bedragen zijn inclusief btw.
            </p>
          )}
        </footer>
      </div>
    </div>
  );
}
