import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../shared/lib/supabase';
import { logActivity } from '../../lib/activity';
import { SkeletonBlock } from '../../components/Skeleton';
import { UndoToast } from '../../components/UndoToast';
import { useRowSaver } from '../../lib/saveState';
import { useUndoable } from '../../lib/undo';
import { IconPlus, IconTrash } from '../../components/icons';
import {
  buildPackingItems, CATEGORY_LABELS, CATEGORY_ORDER,
  PERISHABILITY_LABELS, PERISHABILITY_ORDER,
} from '../../../shared/lib/packing';
import type {
  CocktailIngredient, PackingCategory, PackingList, PackingListItem,
  PackingTemplateItem, Perishability, QuoteRequest,
} from '../../../shared/types/db';

type SortMode = 'categorie' | 'houdbaarheid';

interface Props {
  request: QuoteRequest;
}

export function PackingTab({ request }: Props) {
  const [list, setList] = useState<PackingList | null>(null);
  const [items, setItems] = useState<PackingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('categorie');
  const [busy, setBusy] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);

  // Read-only summary of the choice made on the Cocktails tab.
  const [chosenSummary, setChosenSummary] = useState<{ name: string; count: number }[]>([]);

  const itemsRef = useRef(items);
  itemsRef.current = items;

  const undo = useUndoable();

  const saver = useRowSaver({
    key: 'paklijstregels',
    save: async (id) => {
      const item = itemsRef.current.find((i) => i.id === id);
      if (!item) return null;
      const { error } = await supabase.from('packing_list_items').update({
        name: item.name, quantity: item.quantity, unit: item.unit,
        category: item.category, perishability: item.perishability,
      }).eq('id', id);
      return error ? `Regel opslaan mislukt: ${error.message}` : null;
    },
  });

  useEffect(() => {
    let alive = true;
    async function load() {
      const [listRes, chosenRes] = await Promise.all([
        supabase.from('packing_lists').select('*').eq('request_id', request.id).maybeSingle(),
        supabase.from('request_cocktails').select('planned_count, cocktail_menu(name)').eq('request_id', request.id),
      ]);
      if (!alive) return;
      if (listRes.error) { setUnavailable(true); setLoading(false); return; }

      // PostgREST types an embedded row as an array; one cocktail per row here.
      setChosenSummary(
        (chosenRes.data ?? [])
          .map((row) => ({
            name: [row.cocktail_menu].flat()[0]?.name ?? 'Onbekende cocktail',
            count: row.planned_count as number,
          }))
          .sort((a, b) => b.count - a.count),
      );

      if (listRes.data) {
        setList(listRes.data);
        const { data: pli } = await supabase.from('packing_list_items').select('*').eq('list_id', listRes.data.id).order('sort_order');
        if (alive) setItems(pli ?? []);
      }
      setLoading(false);
    }
    load();
    return () => { alive = false; };
  }, [request.id]);

  const checkedCount = items.filter((i) => i.is_checked).length;
  const plannedTotal = chosenSummary.reduce((sum, c) => sum + c.count, 0);
  // The cocktail choice moved on after this list was built.
  const stale = Boolean(
    list?.generated_at && request.cocktails_updated_at &&
    new Date(request.cocktails_updated_at) > new Date(list.generated_at),
  );

  async function generate() {
    setBusy(true);
    try {
      // The cocktail choice lives on its own tab; always read what is stored.
      const { data: rc } = await supabase.from('request_cocktails').select('*').eq('request_id', request.id);
      const chosen: [string, number][] = (rc ?? []).map((row) => [row.cocktail_id, row.planned_count]);

      const [tplRes, ingRes] = await Promise.all([
        // Base kit (package_id null) plus this package's own template.
        supabase.from('packing_templates')
          .select('id, package_id, packing_template_items(*)')
          .or(`package_id.eq.${request.package_id},package_id.is.null`),
        supabase.from('cocktail_ingredients').select('*').in('cocktail_id', chosen.map(([id]) => id)),
      ]);

      const templateItems = (tplRes.data ?? [])
        .flatMap((t) => (t as { packing_template_items?: PackingTemplateItem[] }).packing_template_items ?? []);
      const ingredients = (ingRes.data ?? []) as CocktailIngredient[];
      const drafts = buildPackingItems(
        templateItems,
        chosen.map(([cocktail_id, planned_count]) => ({ cocktail_id, planned_count })),
        ingredients,
        request.guest_count,
        request.cocktail_count,
      );

      const generatedAt = new Date().toISOString();
      let currentList = list;
      if (currentList) {
        await supabase.from('packing_list_items').delete().eq('list_id', currentList.id);
        await supabase.from('packing_lists').update({ generated_at: generatedAt }).eq('id', currentList.id);
        // Keep the local copy in step, otherwise the list keeps reading as stale.
        currentList = { ...currentList, generated_at: generatedAt };
      } else {
        const { data: pl, error } = await supabase.from('packing_lists')
          .insert({ request_id: request.id, generated_at: generatedAt })
          .select().single();
        if (error || !pl) throw error;
        currentList = pl;
      }

      const { data: inserted, error: itemErr } = await supabase.from('packing_list_items')
        .insert(drafts.map((d) => ({ ...d, list_id: currentList!.id })))
        .select();
      if (itemErr) throw itemErr;

      setList(currentList);
      setItems((inserted ?? []).sort((a, b) => a.sort_order - b.sort_order));
      setConfirmRegenerate(false);
      await logActivity(request.id, 'system', `Paklijst gegenereerd (${drafts.length} regels)`);
    } catch (e) {
      console.error('Failed to generate packing list', e);
      setUnavailable(true);
    } finally {
      setBusy(false);
    }
  }

  async function toggleItem(item: PackingListItem) {
    // Optimistic and immediate — this happens with one hand on a crate.
    const next = !item.is_checked;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_checked: next } : i)));
    const { error } = await supabase.from('packing_list_items').update({ is_checked: next }).eq('id', item.id);
    if (error) {
      console.error('Failed to toggle item', error);
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_checked: !next } : i)));
    }
  }

  async function addItem() {
    if (!list) return;
    const sort = items.length ? Math.max(...items.map((i) => i.sort_order)) + 1 : 0;
    const { data, error } = await supabase.from('packing_list_items').insert({
      list_id: list.id, name: '', category: 'barmateriaal', perishability: 'houdbaar',
      quantity: 1, unit: 'st', origin: 'manual', sort_order: sort,
    }).select().single();
    if (!error && data) setItems((prev) => [...prev, data]);
  }

  function patchItem(id: string, patch: Partial<PackingListItem>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    saver.touch(id);
  }

  async function removeItem(item: PackingListItem) {
    saver.forget(item.id);
    setItems((prev) => prev.filter((i) => i.id !== item.id));

    const { error } = await supabase.from('packing_list_items').delete().eq('id', item.id);
    if (error) {
      console.error('Failed to delete item', error);
      setItems((prev) => [...prev, item].sort((a, b) => a.sort_order - b.sort_order));
      return;
    }

    undo.offer(`${item.name || 'Regel'} verwijderd`, async () => {
      const { data, error: backErr } = await supabase.from('packing_list_items').insert(item).select().single();
      if (backErr || !data) { console.error('Failed to restore item', backErr); return; }
      setItems((prev) => [...prev, data].sort((a, b) => a.sort_order - b.sort_order));
    });
  }

  if (loading) return <SkeletonBlock className="h-40" />;

  if (unavailable) {
    return (
      <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
        Paklijsten niet beschikbaar. Voer migratie <code className="font-mono">0005_packing.sql</code> uit in de Supabase SQL-editor.
      </p>
    );
  }

  const cocktailsLink = `/aanvragen/${request.id}?tab=cocktails`;

  const chosenLine = chosenSummary.length
    ? chosenSummary.map((c) => `${c.name} ${c.count}×`).join(' · ')
    : 'Nog geen cocktails gekozen';

  // --- Nothing generated yet --------------------------------------------
  if (!list) {
    return (
      <div className="rounded-xl border border-white/5 bg-surface-elevated p-6">
        <h2 className="text-lg font-medium text-white">Nog geen paklijst</h2>
        <p className="mb-5 mt-1 max-w-prose text-sm leading-relaxed text-muted">
          Genereren zet de basisuitrusting, het pakketsjabloon en de ingrediënten van de gekozen
          cocktails onder elkaar. Daarna kun je regels aanpassen en afvinken.
        </p>

        <div className="mb-5 rounded-lg bg-white/[0.03] px-4 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span className="text-sm text-muted">Gekozen cocktails</span>
            <Link
              to={cocktailsLink}
              replace
              className="rounded text-sm text-gold-light underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
            >
              {chosenSummary.length ? 'Aanpassen' : 'Kies cocktails'}
            </Link>
          </div>
          <p className={`mt-1 text-[0.9375rem] ${chosenSummary.length ? 'text-white/85' : 'text-muted'}`}>{chosenLine}</p>
          {chosenSummary.length > 0 && (
            <p className={`mt-1 text-sm ${plannedTotal === request.cocktail_count ? 'text-ok' : 'text-muted'}`}>
              {plannedTotal} van {request.cocktail_count} cocktails verdeeld
            </p>
          )}
        </div>

        <button
          onClick={generate}
          disabled={busy}
          className="h-12 rounded-lg bg-gold px-6 text-[0.9375rem] font-medium text-surface transition-colors duration-200 hover:bg-gold-light disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
        >
          {busy ? 'Genereren…' : 'Paklijst genereren'}
        </button>
      </div>
    );
  }

  // --- The checklist itself ---------------------------------------------
  const groups = sortMode === 'categorie'
    ? CATEGORY_ORDER.map((c) => ({ key: c as string, label: CATEGORY_LABELS[c], rows: items.filter((i) => i.category === c) }))
    : PERISHABILITY_ORDER.map((p) => ({ key: p as string, label: PERISHABILITY_LABELS[p], rows: items.filter((i) => i.perishability === p) }));

  return (
    <div className="flex flex-col gap-5">
      {stale && (
        <div role="status" className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-gold/30 bg-gold/10 px-4 py-3">
          <p className="min-w-0 flex-1 text-[0.9375rem] text-gold-light">
            {confirmRegenerate
              ? 'Bijwerken bouwt de lijst opnieuw op. Handmatige regels en vinkjes gaan verloren.'
              : 'De cocktailkeuze is gewijzigd na het genereren. Deze paklijst loopt achter.'}
          </p>
          {confirmRegenerate ? (
            <span className="flex shrink-0 items-center gap-2">
              <button
                onClick={generate}
                disabled={busy}
                className="h-10 rounded-lg bg-gold px-4 text-sm font-medium text-surface transition-colors duration-150 hover:bg-gold-light disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
              >
                {busy ? 'Bezig…' : 'Ja, bijwerken'}
              </button>
              <button
                onClick={() => setConfirmRegenerate(false)}
                className="h-10 rounded-lg px-3 text-sm text-muted transition-colors duration-150 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
              >
                Annuleer
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfirmRegenerate(true)}
              className="h-10 shrink-0 rounded-lg border border-gold/40 px-4 text-sm font-medium text-gold-light transition-colors duration-150 hover:bg-gold/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
            >
              Bijwerken
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <p className="min-w-0 text-sm text-white/85">{chosenLine}</p>
        <Link
          to={cocktailsLink}
          replace
          className="shrink-0 rounded text-sm text-gold-light underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
        >
          Cocktails aanpassen
        </Link>
      </div>

      {/* Progress — sticky so it stays visible while checking off */}
      <div className="sticky top-0 z-20 -mx-1 rounded-xl border border-white/10 bg-surface-elevated/95 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[0.9375rem] font-medium text-white">{checkedCount} van {items.length} ingepakt</span>
          <div className="h-2 min-w-[8rem] flex-1 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={checkedCount} aria-valuemin={0} aria-valuemax={items.length} aria-label="Inpakvoortgang">
            <div
              className="h-full rounded-full bg-gold transition-transform duration-200 origin-left"
              style={{ transform: `scaleX(${items.length ? checkedCount / items.length : 0})` }}
            />
          </div>
          <div className="inline-flex gap-1 rounded-lg border border-white/10 p-0.5" role="tablist" aria-label="Sorteer paklijst">
            {(['categorie', 'houdbaarheid'] as SortMode[]).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={sortMode === m}
                onClick={() => setSortMode(m)}
                className={`h-9 rounded-md px-3 text-sm capitalize transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2 ${
                  sortMode === m ? 'bg-gold font-medium text-surface' : 'text-muted hover:text-white'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {groups.filter((g) => g.rows.length > 0).map((group) => (
        <section key={group.key} aria-label={group.label}>
          <h3 className="mb-2 flex items-baseline gap-2 text-sm font-semibold uppercase tracking-wider text-muted">
            {group.label}
            <span className="font-normal normal-case tracking-normal">({group.rows.filter((r) => r.is_checked).length}/{group.rows.length})</span>
          </h3>
          <ul className="overflow-hidden rounded-xl border border-white/5 bg-surface-elevated">
            {group.rows.map((item) => (
              <li key={item.id} className="group flex min-h-[3.5rem] items-center gap-1 border-b border-white/5 last:border-b-0">
                {/* Full-width tap area for the check */}
                <button
                  onClick={() => toggleItem(item)}
                  role="checkbox"
                  aria-checked={item.is_checked}
                  aria-label={`${item.name || 'Naamloos artikel'}, ${item.quantity} ${item.unit}`}
                  className="flex min-h-[3.5rem] min-w-0 flex-1 items-center gap-3.5 px-4 text-left transition-colors duration-150 hover:bg-white/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold-light"
                >
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors duration-150 ${
                    item.is_checked ? 'border-gold bg-gold text-surface' : 'border-white/25'
                  }`}>
                    {item.is_checked && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                    )}
                  </span>
                  <span className={`min-w-0 flex-1 truncate text-[0.9375rem] transition-colors duration-150 ${item.is_checked ? 'text-muted line-through' : 'text-white'}`}>
                    {item.name || <em className="text-muted">naamloos</em>}
                  </span>
                  <span className={`shrink-0 text-[0.9375rem] ${item.is_checked ? 'text-muted' : 'text-white/85'}`}>
                    {item.quantity} {item.unit}
                  </span>
                </button>
                <details className="relative shrink-0">
                  <summary
                    aria-label={`Bewerk ${item.name || 'artikel'}`}
                    className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light [&::-webkit-details-marker]:hidden"
                  >
                    ⋯
                  </summary>
                  <div className="absolute right-2 z-30 mt-1 w-64 rounded-xl border border-white/10 bg-surface-raised p-3 shadow-[0_20px_45px_-18px_rgba(0,0,0,0.7)]">
                    <label className="mb-2 block text-xs text-muted">
                      Naam
                      <input
                        value={item.name}
                        onChange={(e) => patchItem(item.id, { name: e.target.value })}
                        className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-surface px-2.5 text-[0.9375rem] text-white focus:border-gold/50 focus:outline-none"
                      />
                    </label>
                    <div className="flex gap-2">
                      <label className="block flex-1 text-xs text-muted">
                        Aantal
                        <input
                          type="number" min="0" step="0.5" value={item.quantity}
                          onChange={(e) => patchItem(item.id, { quantity: Number(e.target.value) })}
                          className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-surface px-2.5 text-right text-[0.9375rem] text-white focus:border-gold/50 focus:outline-none"
                        />
                      </label>
                      <label className="block flex-1 text-xs text-muted">
                        Eenheid
                        <input
                          value={item.unit}
                          onChange={(e) => patchItem(item.id, { unit: e.target.value })}
                          className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-surface px-2.5 text-[0.9375rem] text-white focus:border-gold/50 focus:outline-none"
                        />
                      </label>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <label className="block flex-1 text-xs text-muted">
                        Categorie
                        <select
                          value={item.category}
                          onChange={(e) => { patchItem(item.id, { category: e.target.value as PackingCategory }); }}
                          className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-surface px-2 text-sm text-white focus:border-gold/50 focus:outline-none"
                        >
                          {CATEGORY_ORDER.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                        </select>
                      </label>
                      <label className="block flex-1 text-xs text-muted">
                        Houdbaarheid
                        <select
                          value={item.perishability}
                          onChange={(e) => { patchItem(item.id, { perishability: e.target.value as Perishability }); }}
                          className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-surface px-2 text-sm text-white focus:border-gold/50 focus:outline-none"
                        >
                          {PERISHABILITY_ORDER.map((p) => <option key={p} value={p}>{PERISHABILITY_LABELS[p]}</option>)}
                        </select>
                      </label>
                    </div>
                    <button
                      onClick={() => removeItem(item)}
                      className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-danger/30 text-sm text-danger transition-colors duration-150 hover:bg-danger/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-danger focus-visible:outline-offset-2"
                    >
                      <IconTrash size={14} /> Verwijder regel
                    </button>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={addItem}
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/15 px-4 text-[0.9375rem] text-white/85 transition-colors duration-200 hover:border-white/30 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
        >
          <IconPlus size={16} /> Regel toevoegen
        </button>
        <div className="ml-auto">
          {/* When the stale banner is up it owns the confirmation, so only one
              set of yes/no buttons is ever on screen. */}
          {confirmRegenerate && !stale ? (
            <span className="inline-flex flex-wrap items-center gap-2">
              <span className="text-sm text-danger">Handmatige regels en vinkjes gaan verloren.</span>
              <button onClick={generate} disabled={busy} className="h-11 rounded-lg border border-danger/40 bg-danger/15 px-4 text-sm font-medium text-danger transition-colors duration-150 hover:bg-danger/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-danger focus-visible:outline-offset-2">
                {busy ? 'Bezig…' : 'Ja, opnieuw genereren'}
              </button>
              <button onClick={() => setConfirmRegenerate(false)} className="h-11 rounded-lg px-3 text-sm text-muted transition-colors duration-150 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2">
                Annuleer
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfirmRegenerate(true)}
              className="h-11 rounded-lg px-4 text-sm text-muted transition-colors duration-200 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
            >
              Opnieuw genereren
            </button>
          )}
        </div>
      </div>

      <UndoToast pending={undo.pending} onUndo={() => { void undo.run(); }} onDismiss={undo.dismiss} />
    </div>
  );
}
