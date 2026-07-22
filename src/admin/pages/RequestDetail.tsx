import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../../shared/lib/supabase';
import { AdminLayout } from '../layout/AdminLayout';
import { StatusControl } from '../components/StatusControl';
import { SkeletonBlock } from '../components/Skeleton';
import { TimelineTab } from './tabs/TimelineTab';
import { QuoteTab } from './tabs/QuoteTab';
import { CocktailsTab } from './tabs/CocktailsTab';
import { PackingTab } from './tabs/PackingTab';
import { InvoiceTab } from './tabs/InvoiceTab';
import { SaveBar } from '../components/SaveBar';
import { UndoToast } from '../components/UndoToast';
import { DeleteRequestButton } from '../components/DeleteRequestButton';
import { SaveStatusProvider, useAutosave } from '../lib/saveState';
import { useUndoable } from '../lib/undo';
import { restoreRequest, UNDO_WINDOW_MS, type RequestSnapshot } from '../lib/requestDeletion';
import { formatDateLongNL, formatEuro } from '../../shared/lib/format';
import { normalizeStatus } from '../../shared/lib/workflow';
import { IconMail, IconMapPin, IconPhone, IconUsers } from '../components/icons';
import type { QuoteRequest, QuoteStatus } from '../../shared/types/db';

type TabId = 'tijdlijn' | 'offerte' | 'cocktails' | 'paklijst' | 'factuur';
const TABS: { id: TabId; label: string }[] = [
  { id: 'tijdlijn', label: 'Tijdlijn' },
  { id: 'offerte', label: 'Offerte' },
  { id: 'cocktails', label: 'Cocktails' },
  { id: 'paklijst', label: 'Paklijst' },
  { id: 'factuur', label: 'Factuur' },
];

export function RequestDetail() {
  return (
    <SaveStatusProvider>
      <RequestDetailScreen />
    </SaveStatusProvider>
  );
}

function RequestDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const tab: TabId = (TABS.some((t) => t.id === rawTab) ? rawTab : 'tijdlijn') as TabId;

  const [request, setRequest] = useState<QuoteRequest | null>(null);
  const [packageName, setPackageName] = useState('');
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [notes, setNotes] = useState('');
  const [deleted, setDeleted] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const undo = useUndoable(UNDO_WINDOW_MS);

  const { reset: resetNotes } = useAutosave({
    key: 'notitie',
    value: notes,
    enabled: request !== null,
    save: async (text) => {
      if (!request) return null;
      const value = text || null;
      const { error } = await supabase.from('quote_requests').update({ internal_notes: value }).eq('id', request.id);
      if (error) return `Notitie opslaan mislukt: ${error.message}`;
      setRequest((r) => (r ? { ...r, internal_notes: value } : r));
      return null;
    },
  });

  useEffect(() => {
    if (!id) return;
    let alive = true;
    async function load() {
      const { data, error } = await supabase.from('quote_requests').select('*').eq('id', id).maybeSingle();
      if (!alive) return;
      if (error || !data) { setLoading(false); return; }
      setRequest(data);
      resetNotes(data.internal_notes ?? '');
      setNotes(data.internal_notes ?? '');
      setLoading(false);
      const { data: pkg } = await supabase.from('service_packages').select('package_name').eq('id', data.package_id).maybeSingle();
      if (alive && pkg) setPackageName(pkg.package_name);
    }
    load();
    return () => { alive = false; };
  }, [id, resetNotes]);

  function selectTab(next: TabId) {
    // replace: switching tabs should not pile up history — back returns to the list.
    setSearchParams(next === 'tijdlijn' ? {} : { tab: next }, { replace: true });
  }

  if (loading) {
    return (
      <AdminLayout title="Aanvraag" back={{ to: '/aanvragen', label: 'Aanvragen' }}>
        <SkeletonBlock className="h-48" />
      </AdminLayout>
    );
  }

  if (!request) {
    return (
      <AdminLayout title="Aanvraag niet gevonden" back={{ to: '/aanvragen', label: 'Aanvragen' }}>
        <div className="rounded-xl border border-white/5 bg-surface-elevated p-10 text-center text-muted">
          Deze aanvraag bestaat niet (meer). <Link to="/aanvragen" className="text-gold-light underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light rounded">Terug naar de lijst</Link>.
        </div>
      </AdminLayout>
    );
  }

  async function undoDelete(snapshot: RequestSnapshot) {
    const message = await restoreRequest(snapshot);
    if (message) { setRestoreError(message); return; }
    setDeleted(false);
    setReloadKey((k) => k + 1);
  }

  // The page stays put after deleting rather than bouncing to the list, so the
  // undo stays where you were looking when you pressed the button.
  if (deleted) {
    return (
      <AdminLayout title="Aanvraag verwijderd" back={{ to: '/aanvragen', label: 'Aanvragen' }}>
        <div className="rounded-xl border border-white/5 bg-surface-elevated p-10 text-center">
          <p className="text-[0.9375rem] text-white/85">
            {request.full_name} is uit de database gehaald.
          </p>
          {restoreError && (
            <p role="alert" className="mx-auto mt-3 max-w-prose text-sm text-danger">{restoreError}</p>
          )}
          <Link
            to="/aanvragen"
            className="mt-6 inline-flex h-11 items-center rounded-lg border border-white/15 px-5 text-[0.9375rem] text-white/85 transition-colors duration-200 hover:border-white/30 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
          >
            Terug naar aanvragen
          </Link>
        </div>
        <UndoToast pending={undo.pending} onUndo={() => { void undo.run(); }} onDismiss={undo.dismiss} />
      </AdminLayout>
    );
  }

  const status = normalizeStatus(request.status);
  const invoiceReady = ['completed', 'invoiced', 'paid'].includes(status);

  return (
    <AdminLayout
      title={request.full_name}
      back={{ to: '/aanvragen', label: 'Aanvragen' }}
      actions={<StatusControl request={request} onChanged={(s: QuoteStatus) => setRequest({ ...request, status: s })} onLogged={() => setReloadKey((k) => k + 1)} />}
    >
      {/* Core facts — stays put while tabs switch below */}
      <section aria-label="Kerngegevens" className="mb-6 rounded-xl border border-white/5 bg-surface-elevated p-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <a href={`tel:${request.phone}`} className="inline-flex w-fit items-center gap-2.5 rounded text-[0.9375rem] text-white transition-colors hover:text-gold-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2">
              <IconPhone size={16} className="text-muted" /> {request.phone || '—'}
            </a>
            <a href={`mailto:${request.email}`} className="inline-flex w-fit items-center gap-2.5 rounded text-[0.9375rem] text-white transition-colors hover:text-gold-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2">
              <IconMail size={16} className="text-muted" /> {request.email}
            </a>
            <span className="inline-flex items-center gap-2.5 text-[0.9375rem] text-white/85">
              <IconMapPin size={16} className="text-muted" />
              {request.event_address ? `${request.event_address}, ` : ''}{request.event_city}, {request.event_postcode} · {request.distance_km} km
            </span>
            <span className="inline-flex items-center gap-2.5 text-[0.9375rem] text-white/85">
              <IconUsers size={16} className="text-muted" />
              {request.guest_count} gasten · {request.cocktail_count} cocktails
            </span>
          </div>
          <div className="flex flex-col gap-1.5 md:text-right">
            <span className="text-lg font-medium text-white">{request.event_type}</span>
            <span className="text-[0.9375rem] text-white/85">
              {formatDateLongNL(request.event_date)}{request.event_time ? `, ${request.event_time.slice(0, 5)} uur` : ''}
            </span>
            <span className="text-[0.9375rem] text-muted">
              {packageName || 'Pakket onbekend'}{request.arrangement ? ` · ${request.arrangement}` : ''}
            </span>
            <span className="mt-1 font-heading text-2xl text-gold-light">{formatEuro(request.estimated_total)}</span>
            <span className="text-xs uppercase tracking-wider text-muted">Geschat via wizard</span>
          </div>
        </div>

        {request.special_requests && (
          <p className="mt-5 rounded-lg bg-white/[0.03] px-4 py-3 text-[0.9375rem] leading-relaxed text-white/85">
            <span className="text-muted">Bijzondere verzoeken: </span>{request.special_requests}
          </p>
        )}

        <div className="mt-5">
          <label htmlFor="internal-notes" className="mb-1.5 block text-sm text-muted">
            Interne notitie
          </label>
          <textarea
            id="internal-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Alleen voor jou zichtbaar…"
            className="w-full rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-[0.9375rem] text-white placeholder:text-muted transition-colors focus:border-gold/50 focus:outline-none"
          />
        </div>
      </section>

      {/* Tabs */}
      {/* Five tabs no longer fit a 375px phone; scroll horizontally rather than
          cram the labels or hide one behind a menu. */}
      <div role="tablist" aria-label="Aanvraagonderdelen" className="mb-6 flex gap-1 overflow-x-auto border-b border-white/10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => {
          const disabled = t.id === 'factuur' && !invoiceReady;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              disabled={disabled}
              title={disabled ? 'Beschikbaar zodra de klus op Uitgevoerd staat' : undefined}
              onClick={() => selectTab(t.id)}
              className={`relative -mb-px h-12 shrink-0 px-4 text-[0.9375rem] transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:-outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${
                active ? 'border-b-2 border-gold text-gold-light' : 'border-b-2 border-transparent text-muted hover:text-white'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'tijdlijn' && <TimelineTab requestId={request.id} reloadKey={reloadKey} />}
      {tab === 'offerte' && <QuoteTab request={request} packageName={packageName} onLogged={() => setReloadKey((k) => k + 1)} onStatusChanged={(s) => setRequest({ ...request, status: s })} />}
      {tab === 'cocktails' && <CocktailsTab request={request} onCocktailsChanged={(stampedAt) => setRequest({ ...request, cocktails_updated_at: stampedAt })} />}
      {tab === 'paklijst' && <PackingTab request={request} />}
      {tab === 'factuur' && invoiceReady && <InvoiceTab request={request} onLogged={() => setReloadKey((k) => k + 1)} onStatusChanged={(s) => setRequest({ ...request, status: s })} />}

      {/* Set apart, below everything, past the fold: nothing you reach for by
          accident on the way to something else. */}
      <section aria-label="Aanvraag verwijderen" className="mt-12 flex flex-col items-start gap-x-6 gap-y-4 border-t border-white/5 pt-6 sm:flex-row sm:items-center">
        <p className="min-w-0 text-sm leading-relaxed text-muted sm:flex-1">
          Verwijdert deze aanvraag met alles wat eronder hangt — offertes, cocktailkeuze, paklijst en tijdlijn.
        </p>
        <DeleteRequestButton
          request={request}
          onDeleted={(snapshot) => {
            setRestoreError(null);
            setDeleted(true);
            undo.offer(`${snapshot.request.full_name} verwijderd`, () => undoDelete(snapshot));
          }}
        />
      </section>

      <UndoToast pending={undo.pending} onUndo={() => { void undo.run(); }} onDismiss={undo.dismiss} />
      <SaveBar />
    </AdminLayout>
  );
}
